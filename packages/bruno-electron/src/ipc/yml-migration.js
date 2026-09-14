const fs = require('node:fs');
const path = require('node:path');
const fsExtra = require('fs-extra');
const { ipcMain, app } = require('electron');
const {
  parseCollection,
  stringifyCollection,
  parseRequestViaWorker,
  stringifyRequestViaWorker,
  parseFolderViaWorker,
  stringifyFolderViaWorker,
  parseEnvironmentViaWorker,
  stringifyEnvironmentViaWorker
} = require('@usebruno/filestore');
const { transformProxyConfig } = require('@usebruno/requests');
const { getCollectionFormat, getCollectionStats, writeFile } = require('../utils/filesystem');
const { openCollection } = require('../app/collections');
const snapshotManager = require('../services/snapshot');
const { unmount, clearCollectionIndex } = require('./mount');
const { clearBrunoConfig } = require('../store/bruno-config');
const { clearRequestUidsForCollection } = require('../cache/requestUids');

const MIGRATION_CANCELLED_MESSAGE = 'Migration cancelled';
const MIGRATION_IGNORED_DIRS = new Set(['node_modules', '.git']);

// Cancellation is cooperative: the pipeline checks this set between file operations,
// so a cancel takes effect at the next file boundary — never mid-write.
const migrationCancellations = new Set();

// Rewrites `bru.runRequest("path.bru")` in a script fragment so the trailing `.bru`
// is dropped. The network handler (ipc/network/index.js — `runRequestByItemPathname`)
// appends the collection's current format extension when the pathname has none, so an
// extensionless path resolves correctly in both bru and yml collections. A migrated
// script that still names `"foo.bru"` would otherwise try to load a file that no
// longer exists; emitting extensionless paths also keeps the script portable across
// any future format change.
//
// The rewriter walks the script once through a small state machine so it never
// rewrites text that isn't a real call:
//   - line and block comments are copied through untouched
//   - single/double-quoted string literals are treated as opaque
//   - template literals are scanned char-by-char, but `${...}` substitutions drop
//     back into code mode with brace-depth tracking so a call nested inside a
//     template still gets rewritten
//   - regex literals are detected by lookback (whether the position expects a value
//     or an operator) and skipped as opaque, so patterns like `/bru\.runRequest\(/`
//     never trigger a false match
// Only calls at code level whose sole argument is one string literal ending in
// `.bru` are rewritten — commented-out calls, matches embedded in an outer literal,
// and compound arguments such as `bru.runRequest("a.bru" + suffix)` are emitted
// verbatim. Linear-time on script length; a cheap `indexOf` fast path skips scripts
// that don't mention runRequest.

const RUN_REQUEST_CALL_TOKEN = 'bru.runRequest';
const BRU_EXTENSION = '.bru';
const IDENT_CHAR_REGEX = /[A-Za-z0-9_$]/;
const REGEX_FLAG_REGEX = /[dgimsuy]/;
// Keywords after which a `/` opens a regex literal, not a division. The full JS
// keyword set is much larger, but only value-expecting ones can precede a regex.
const VALUE_EXPECTING_KEYWORDS = new Set([
  'return', 'typeof', 'delete', 'throw', 'in', 'of', 'void', 'new',
  'instanceof', 'await', 'yield', 'do', 'else', 'case'
]);

const isWhitespaceChar = (ch) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';

// Returns the index just past the closing quote of a JS string starting at `start`.
// Honours `\` escapes; single/double quoted strings terminate at an unescaped newline
// so a syntactically broken script cannot swallow the rest of the scanner input.
// Not used for template literals — those are scanned inline so substitutions can
// re-enter code mode.
const findStringLiteralEnd = (code, start, quote) => {
  const n = code.length;
  let j = start + 1;
  while (j < n) {
    const ch = code[j];
    if (ch === '\\') {
      j += 2;
      continue;
    }
    if (ch === quote) return j + 1;
    if (ch === '\n' || ch === '\r') return j;
    j++;
  }
  return n;
};

// Attempts to read a JS regex literal starting at `start` (which must be `/`).
// Returns the end index just past the closing `/` and any flag chars, or -1 when
// the `/` is not a valid regex (unterminated, contains a raw newline). Character
// classes `[...]` are respected so `/`s inside them don't close the literal.
const findRegexLiteralEnd = (code, start) => {
  const n = code.length;
  let j = start + 1;
  let inCharClass = false;
  while (j < n) {
    const ch = code[j];
    if (ch === '\\') {
      j += 2;
      continue;
    }
    if (ch === '\n' || ch === '\r') return -1;
    if (inCharClass) {
      if (ch === ']') inCharClass = false;
    } else if (ch === '[') {
      inCharClass = true;
    } else if (ch === '/') {
      j++;
      while (j < n && REGEX_FLAG_REGEX.test(code[j])) j++;
      return j;
    }
    j++;
  }
  return -1;
};

// Decides whether a `/` at position `pos` starts a regex literal (value-expecting
// context) or a division (operator-expecting context), based on the last significant
// character emitted and — when that char is an identifier char — the whole preceding
// word so keywords like `return /re/` are recognised as regex.
const startsRegexLiteral = (out, prevSignificant) => {
  if (prevSignificant === '') return true;
  if (prevSignificant === ')' || prevSignificant === ']') return false;
  if (prevSignificant === '`' || prevSignificant === '"' || prevSignificant === '\'') return false;
  if (prevSignificant === '/') return false;
  if (!IDENT_CHAR_REGEX.test(prevSignificant)) return true;
  let k = out.length - 1;
  while (k >= 0 && IDENT_CHAR_REGEX.test(out[k])) k--;
  return VALUE_EXPECTING_KEYWORDS.has(out.slice(k + 1));
};

const matchesRunRequestCallStart = (code, i) => {
  if (i > 0 && IDENT_CHAR_REGEX.test(code[i - 1])) return false;
  for (let k = 0; k < RUN_REQUEST_CALL_TOKEN.length; k++) {
    if (code[i + k] !== RUN_REQUEST_CALL_TOKEN[k]) return false;
  }
  const after = code[i + RUN_REQUEST_CALL_TOKEN.length];
  return after === '(' || (after !== undefined && isWhitespaceChar(after));
};

// Attempts to rewrite a single `bru.runRequest(<string-literal>)` call starting at
// `start`. Returns `{ text, next }` only when the argument is exactly one quoted
// literal whose content ends in `.bru`; otherwise returns null and the caller falls
// through to per-char scanning (which safely skips embedded string content).
const tryRewriteRunRequestCall = (code, start) => {
  const n = code.length;
  let j = start + RUN_REQUEST_CALL_TOKEN.length;
  while (j < n && isWhitespaceChar(code[j])) j++;
  if (code[j] !== '(') return null;
  j++;
  while (j < n && isWhitespaceChar(code[j])) j++;
  const quote = code[j];
  if (quote !== '"' && quote !== '\'' && quote !== '`') return null;
  // For a runRequest arg we never expect `${...}` substitutions, so plain string
  // scanning is sufficient — treating backticks as opaque here is intentional.
  const strEnd = findTemplateOrStringEnd(code, j, quote);
  if (strEnd > n || code[strEnd - 1] !== quote) return null;
  let k = strEnd;
  while (k < n && isWhitespaceChar(code[k])) k++;
  if (code[k] !== ')') return null;
  const contentStart = j + 1;
  const contentEnd = strEnd - 1;
  const content = code.slice(contentStart, contentEnd);
  if (!content.endsWith(BRU_EXTENSION)) return null;
  const stripped = content.slice(0, -BRU_EXTENSION.length);
  const text = code.slice(start, contentStart) + stripped + code.slice(contentEnd, k + 1);
  return { text, next: k + 1 };
};

// Like findStringLiteralEnd but tolerates backticks. Newlines inside a template
// literal are legal, so only terminate at the matching closing quote.
const findTemplateOrStringEnd = (code, start, quote) => {
  if (quote !== '`') return findStringLiteralEnd(code, start, quote);
  const n = code.length;
  let j = start + 1;
  while (j < n) {
    const ch = code[j];
    if (ch === '\\') {
      j += 2;
      continue;
    }
    if (ch === '`') return j + 1;
    j++;
  }
  return n;
};

const stripBruExtInRunRequest = (code) => {
  if (typeof code !== 'string' || code.length === 0) return code;
  if (code.indexOf('runRequest') === -1) return code;

  const n = code.length;
  let out = '';
  let i = 0;
  // A stack of frames lets `${...}` re-enter code mode while an outer template
  // waits for its closing backtick. The root frame is code with braceDepth 0;
  // each template pushes a template frame; each `${` inside a template pushes a
  // code frame with braceDepth 1 so its matching `}` returns to the template.
  const frames = [{ kind: 'code', braceDepth: 0 }];
  let prevSignificant = '';

  while (i < n) {
    const frame = frames[frames.length - 1];

    if (frame.kind === 'template') {
      const c = code[i];
      if (c === '\\') {
        out += code.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (c === '`') {
        out += c;
        i++;
        frames.pop();
        prevSignificant = '`';
        continue;
      }
      if (c === '$' && code[i + 1] === '{') {
        out += '${';
        i += 2;
        frames.push({ kind: 'code', braceDepth: 1 });
        prevSignificant = '';
        continue;
      }
      out += c;
      i++;
      continue;
    }

    const c = code[i];
    const next = code[i + 1];

    if (c === '/' && next === '/') {
      const nl = code.indexOf('\n', i + 2);
      const end = nl === -1 ? n : nl;
      out += code.slice(i, end);
      i = end;
      continue;
    }

    if (c === '/' && next === '*') {
      const close = code.indexOf('*/', i + 2);
      const end = close === -1 ? n : close + 2;
      out += code.slice(i, end);
      i = end;
      continue;
    }

    if (c === '/' && startsRegexLiteral(out, prevSignificant)) {
      const end = findRegexLiteralEnd(code, i);
      if (end > 0) {
        out += code.slice(i, end);
        i = end;
        prevSignificant = '/';
        continue;
      }
    }

    if (c === '"' || c === '\'') {
      const end = findStringLiteralEnd(code, i, c);
      out += code.slice(i, end);
      i = end;
      prevSignificant = c;
      continue;
    }

    if (c === '`') {
      out += c;
      i++;
      frames.push({ kind: 'template' });
      continue;
    }

    if (c === '{') {
      out += c;
      i++;
      if (frame.braceDepth > 0) frame.braceDepth++;
      prevSignificant = '{';
      continue;
    }

    if (c === '}') {
      if (frame.braceDepth > 0) {
        frame.braceDepth--;
        if (frame.braceDepth === 0) {
          out += c;
          i++;
          frames.pop();
          prevSignificant = '}';
          continue;
        }
      }
      out += c;
      i++;
      prevSignificant = '}';
      continue;
    }

    if (c === 'b' && matchesRunRequestCallStart(code, i)) {
      const rewrite = tryRewriteRunRequestCall(code, i);
      if (rewrite) {
        out += rewrite.text;
        i = rewrite.next;
        prevSignificant = ')';
        continue;
      }
    }

    out += c;
    i++;
    if (!isWhitespaceChar(c)) prevSignificant = c;
  }

  return out;
};

const stripBruExtInParsedScripts = (parsed) => {
  const request = parsed?.request;
  if (!request) return;
  if (request.script) {
    request.script.req = stripBruExtInRunRequest(request.script.req);
    request.script.res = stripBruExtInRunRequest(request.script.res);
  }
  request.tests = stripBruExtInRunRequest(request.tests);
};

const collectBruFilesForMigration = (root, extraIgnored = []) => {
  const ignoredNames = new Set([...MIGRATION_IGNORED_DIRS, ...extraIgnored]);
  const results = [];

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      if (ignoredNames.has(entry.name)) continue;
      if (entry.isSymbolicLink()) continue;
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile() && path.extname(entry.name) === '.bru') {
        results.push(entryPath);
      }
    }
  };

  walk(root);
  return results;
};

/**
 * Converts every .bru file of a collection to its yml equivalent on disk, then removes
 * the bru sources. Destructive work is deferred to the very end and guarded by a backup
 * copy, so a failure or cancellation at ANY point restores the collection exactly:
 *  - parsing:    read + convert everything in memory, nothing written yet
 *  - writing:    write yml files (rollback = delete them, bru sources untouched)
 *  - finalizing: copy bru sources + bruno.json into backupRootDir, then unlink them
 *                (rollback = copy them back, then delete the written yml)
 *
 * Non-.bru files are never touched. Pre-existing target yml files abort the migration
 * up front — rolling back must never delete a file this run didn't create.
 */
const migrateCollectionOnDisk = async ({
  collectionPathname,
  brunoConfig,
  backupRootDir,
  checkCancelled = () => {},
  emitProgress = () => {},
  reportError = () => {}
}) => {
  const brunoJsonPath = path.join(collectionPathname, 'bruno.json');
  const collectionBruPath = path.join(collectionPathname, 'collection.bru');
  const envDirPath = path.join(collectionPathname, 'environments');
  const ocYmlPath = path.join(collectionPathname, 'opencollection.yml');

  const writtenYmlFiles = [];
  // Originals already unlinked, restorable from the backup copy
  const restorePlan = [];
  let backupDir = null;
  let keepBackup = false;

  // Test hook: slows the per-file loop so e2e specs can cancel mid-migration deterministically
  const fileDelayMs = Number(process.env.BRUNO_MIGRATE_TO_YML_FILE_DELAY_MS) || 0;

  try {
    let collectionRoot = {};
    if (fs.existsSync(collectionBruPath)) {
      collectionRoot = parseCollection(fs.readFileSync(collectionBruPath, 'utf8'), { format: 'bru' });
      stripBruExtInParsedScripts(collectionRoot);
    }

    const ymlBrunoConfig = { ...brunoConfig };
    delete ymlBrunoConfig.version; // drop the bru format marker
    ymlBrunoConfig.opencollection = '1.0.0';
    // Carry the user-facing version: bru's collectionVersion becomes yml's info.version.
    if (ymlBrunoConfig.collectionVersion) {
      ymlBrunoConfig.version = ymlBrunoConfig.collectionVersion;
    }
    delete ymlBrunoConfig.collectionVersion;

    if (ymlBrunoConfig.proxy) {
      ymlBrunoConfig.proxy = transformProxyConfig(ymlBrunoConfig.proxy);
    }

    // bruno.json + collection.bru merge into a single opencollection.yml
    const ymlCollectionContent = stringifyCollection(collectionRoot, ymlBrunoConfig, { format: 'yml' });

    const userIgnored = Array.isArray(brunoConfig?.ignore) ? brunoConfig.ignore : [];
    const bruFiles = collectBruFilesForMigration(collectionPathname, userIgnored);

    // Phase 1: read → parse → convert in memory; nothing is written until every file
    // converted cleanly. Parse/stringify runs on the filestore worker pool so the main
    // thread stays free to process the cancel IPC (the ohm-js grammars block the event
    // loop for hundreds of ms per file on large collections — a sync loop would swallow
    // every cancel message).
    const parseErrors = [];
    const conversionPlan = [];
    // bru → yml path map for remapping persisted tabs across all workspace snapshot entries
    const tabPathMap = {};

    for (let i = 0; i < bruFiles.length; i++) {
      checkCancelled();
      if (fileDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, fileDelayMs));
      }

      const bruFilePath = bruFiles[i];
      const basename = path.basename(bruFilePath);
      const dirname = path.dirname(bruFilePath);

      // The collection root file has no yml counterpart of its own — it was folded
      // into opencollection.yml above and only needs deleting.
      if (basename === 'collection.bru' && path.normalize(dirname) === path.normalize(collectionPathname)) {
        emitProgress('parsing', i + 1, bruFiles.length);
        continue;
      }

      try {
        const bruContent = await fs.promises.readFile(bruFilePath, 'utf8');

        let ymlPath;
        let ymlContent;
        if (path.normalize(dirname) === path.normalize(envDirPath)) {
          const envData = await parseEnvironmentViaWorker(bruContent, { format: 'bru' });
          ymlPath = bruFilePath.replace(/\.bru$/, '.yml');
          ymlContent = await stringifyEnvironmentViaWorker(envData, { format: 'yml' });
        } else if (basename === 'folder.bru') {
          const folderData = await parseFolderViaWorker(bruContent, { format: 'bru' });
          stripBruExtInParsedScripts(folderData);
          ymlPath = path.join(dirname, 'folder.yml');
          ymlContent = await stringifyFolderViaWorker(folderData, { format: 'yml' });
        } else {
          const requestData = await parseRequestViaWorker(bruContent, { format: 'bru' });
          stripBruExtInParsedScripts(requestData);
          ymlPath = bruFilePath.replace(/\.bru$/, '.yml');
          ymlContent = await stringifyRequestViaWorker(requestData, { format: 'yml' });
        }

        checkCancelled();
        conversionPlan.push({ ymlPath, ymlContent });
        tabPathMap[bruFilePath] = ymlPath;
      } catch (parseError) {
        if (parseError?.message === MIGRATION_CANCELLED_MESSAGE) {
          throw parseError;
        }
        parseErrors.push(`${bruFilePath}: ${parseError.message}`);
      }
      emitProgress('parsing', i + 1, bruFiles.length);
    }

    if (parseErrors.length > 0) {
      throw new Error(`Migration aborted — ${parseErrors.length} file(s) failed to parse:\n${parseErrors.join('\n')}`);
    }

    const collisions = conversionPlan
      .map(({ ymlPath }) => ymlPath)
      .filter((ymlPath) => fs.existsSync(ymlPath));
    if (fs.existsSync(ocYmlPath)) {
      collisions.push(ocYmlPath);
    }
    if (collisions.length > 0) {
      throw new Error(`Migration aborted — target yml file(s) already exist:\n${collisions.join('\n')}`);
    }

    // Phase 2: write the converted yml files
    const totalWrites = conversionPlan.length + 1;
    for (let i = 0; i < conversionPlan.length; i++) {
      checkCancelled();
      const { ymlPath, ymlContent } = conversionPlan[i];
      await writeFile(ymlPath, ymlContent);
      writtenYmlFiles.push(ymlPath);
      emitProgress('writing', i + 1, totalWrites);
    }
    checkCancelled();
    await writeFile(ocYmlPath, ymlCollectionContent);
    writtenYmlFiles.push(ocYmlPath);
    emitProgress('writing', totalWrites, totalWrites);

    // Phase 3: back up the bru sources, then remove them
    const originalsToRemove = [...bruFiles, brunoJsonPath];
    await fsExtra.ensureDir(backupRootDir);
    backupDir = await fs.promises.mkdtemp(path.join(backupRootDir, 'backup-'));
    for (const originalPath of originalsToRemove) {
      checkCancelled();
      await fsExtra.copy(originalPath, path.join(backupDir, path.relative(collectionPathname, originalPath)));
    }

    for (let i = 0; i < originalsToRemove.length; i++) {
      checkCancelled();
      const originalPath = originalsToRemove[i];
      await fs.promises.unlink(originalPath);
      restorePlan.push({
        originalPath,
        backupPath: path.join(backupDir, path.relative(collectionPathname, originalPath))
      });
      emitProgress('finalizing', i + 1, originalsToRemove.length);
    }

    await fsExtra.remove(backupDir).catch(() => {});
    backupDir = null;

    try {
      const { size, filesCount } = await getCollectionStats(collectionPathname);
      ymlBrunoConfig.size = size;
      ymlBrunoConfig.filesCount = filesCount;
    } catch (statsError) {
      console.error('Failed to compute collection stats after migration:', statsError);
    }

    return { brunoConfig: ymlBrunoConfig, tabPathMap };
  } catch (error) {
    // Restore removed originals first (data safety), then clean up what this run added
    for (const { originalPath, backupPath } of restorePlan) {
      try {
        if (!fs.existsSync(originalPath)) {
          await fsExtra.copy(backupPath, originalPath);
        }
      } catch (restoreError) {
        keepBackup = true;
        reportError(`"${originalPath}" could not be restored after the failed migration — a copy is kept at ${backupDir}`);
      }
    }
    for (const ymlFile of writtenYmlFiles) {
      try {
        if (fs.existsSync(ymlFile)) {
          fs.unlinkSync(ymlFile);
        }
      } catch (_) {}
    }
    if (backupDir && !keepBackup) {
      await fsExtra.remove(backupDir).catch(() => {});
    }
    throw error;
  }
};

const migrateCollectionToYml = async ({ mainWindow, watcher, collectionPathname, collectionUid }) => {
  const brunoJsonPath = path.join(collectionPathname, 'bruno.json');
  let brunoConfig;
  try {
    if (getCollectionFormat(collectionPathname) === 'yml') {
      throw new Error('Collection is already in YML format');
    }
    brunoConfig = JSON.parse(fs.readFileSync(brunoJsonPath, 'utf8'));
  } catch (error) {
    try {
      await openCollection(mainWindow, watcher, collectionPathname);
    } catch (_) { }
    throw error;
  }
  // Unmount before touching disk: detach the watcher (for a file-cache v2 mount this also
  // stops the cache write-through riding on it, so migration's own writes/deletes aren't
  // double-processed as live changes) and clear every cache keyed by the deterministic
  // path-derived uid, so the post-migration reopen loads genuinely fresh state.
  if (watcher) {
    watcher.removeWatcher(collectionPathname, mainWindow, collectionUid);
  }
  try {
    await unmount(collectionUid);
  } catch (_) {}
  clearCollectionIndex(collectionPathname);
  clearBrunoConfig(collectionUid);
  clearRequestUidsForCollection(collectionPathname);
  migrationCancellations.delete(collectionUid);

  const emitProgress = (phase, current, total) => {
    mainWindow.webContents.send('main:collection-migration-progress', { collectionUid, phase, current, total });
  };
  const checkCancelled = () => {
    if (migrationCancellations.has(collectionUid)) {
      throw new Error(MIGRATION_CANCELLED_MESSAGE);
    }
  };
  const reportError = (message) => {
    mainWindow.webContents.send('main:display-error', { message });
  };
  // The renderer dropped the collection from its store before invoking us, so on every
  // exit — success, failure or cancel — re-open from disk; the renderer re-creates and
  // mounts it fresh via the normal main:collection-opened flow (same deterministic uid).
  // openCollection catches load errors and returns { opened: false, error } rather than
  // always throwing, so treat that shape as failure too.
  const reopenCollection = async () => {
    let result;
    try {
      result = await openCollection(mainWindow, watcher, collectionPathname);
    } catch (reopenError) {
      console.error('Failed to reopen collection after migration:', reopenError);
      throw reopenError;
    }
    if (result?.opened === false) {
      const message = result.error || 'Failed to reopen collection after migration';
      console.error('Failed to reopen collection after migration:', message);
      throw new Error(message);
    }
  };

  let result;
  try {
    result = await migrateCollectionOnDisk({
      collectionPathname,
      brunoConfig,
      backupRootDir: path.join(app.getPath('userData'), 'tmp', 'yml-migration'),
      checkCancelled,
      emitProgress,
      reportError
    });

    // Remap .bru → .yml tab paths across EVERY workspace snapshot entry for this
    // collection. Force-flushing only rewrites the active workspace; shared
    // collections keep per-workspace tab lists that would otherwise restore as
    // dead "Not Found" tabs after switching workspaces.
    try {
      snapshotManager.remapCollectionTabPaths(collectionPathname, result.tabPathMap || {});
    } catch (snapshotError) {
      console.error('Failed to remap snapshot tabs after migration:', snapshotError);
    }
  } catch (error) {
    try {
      await reopenCollection();
    } catch (_) {
      // Prefer the migration/cancel error; reopen failure is already logged above.
    }
    throw error;
  } finally {
    migrationCancellations.delete(collectionUid);
  }

  await reopenCollection();
  return { brunoConfig: result.brunoConfig };
};

const registerYmlMigrationIpc = (mainWindow, watcher) => {
  ipcMain.handle('renderer:cancel-migrate-collection-to-yml', (event, collectionUid) => {
    migrationCancellations.add(collectionUid);
  });

  ipcMain.handle('renderer:migrate-collection-to-yml', (event, collectionPathname, collectionUid) => {
    return migrateCollectionToYml({ mainWindow, watcher, collectionPathname, collectionUid });
  });
};

module.exports = {
  registerYmlMigrationIpc,
  migrateCollectionOnDisk,
  migrateCollectionToYml,
  stripBruExtInRunRequest,
  MIGRATION_CANCELLED_MESSAGE
};
