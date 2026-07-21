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
const { getCollectionFormat, searchForFiles, getCollectionStats, writeFile } = require('../utils/filesystem');
const { openCollection } = require('../app/collections');
const snapshotManager = require('../services/snapshot');
const { unmount, clearCollectionIndex } = require('./mount');
const { clearBrunoConfig } = require('../store/bruno-config');
const { clearRequestUidsForCollection } = require('../cache/requestUids');

const MIGRATION_CANCELLED_MESSAGE = 'Migration cancelled';

// Cancellation is cooperative: the pipeline checks this set between file operations,
// so a cancel takes effect at the next file boundary — never mid-write.
const migrationCancellations = new Set();

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
    }

    const ymlBrunoConfig = { ...brunoConfig };
    delete ymlBrunoConfig.version; // drop the bru format marker
    ymlBrunoConfig.opencollection = '1.0.0';
    // Carry the user-facing version: bru's collectionVersion becomes yml's info.version.
    if (ymlBrunoConfig.collectionVersion) {
      ymlBrunoConfig.version = ymlBrunoConfig.collectionVersion;
    }
    delete ymlBrunoConfig.collectionVersion;

    // bruno.json + collection.bru merge into a single opencollection.yml
    const ymlCollectionContent = stringifyCollection(collectionRoot, ymlBrunoConfig, { format: 'yml' });

    const bruFiles = searchForFiles(collectionPathname, '.bru');

    // Phase 1: read → parse → convert in memory; nothing is written until every file
    // converted cleanly. Parse/stringify runs on the filestore worker pool so the main
    // thread stays free to process the cancel IPC (the ohm-js grammars block the event
    // loop for hundreds of ms per file on large collections — a sync loop would swallow
    // every cancel message).
    const parseErrors = [];
    const conversionPlan = [];

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
          ymlPath = path.join(dirname, 'folder.yml');
          ymlContent = await stringifyFolderViaWorker(folderData, { format: 'yml' });
        } else {
          const requestData = await parseRequestViaWorker(bruContent, { format: 'bru' });
          ymlPath = bruFilePath.replace(/\.bru$/, '.yml');
          ymlContent = await stringifyRequestViaWorker(requestData, { format: 'yml' });
        }

        checkCancelled();
        conversionPlan.push({ ymlPath, ymlContent });
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

    return { brunoConfig: ymlBrunoConfig };
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
  const format = getCollectionFormat(collectionPathname);
  if (format === 'yml') {
    throw new Error('Collection is already in YML format');
  }
  const brunoJsonPath = path.join(collectionPathname, 'bruno.json');
  const brunoConfig = JSON.parse(fs.readFileSync(brunoJsonPath, 'utf8'));

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
  const reopenCollection = async () => {
    try {
      await openCollection(mainWindow, watcher, collectionPathname);
    } catch (reopenError) {
      console.error('Failed to reopen collection after migration:', reopenError);
    }
  };

  try {
    const result = await migrateCollectionOnDisk({
      collectionPathname,
      brunoConfig,
      backupRootDir: path.join(app.getPath('userData'), 'tmp', 'yml-migration'),
      checkCancelled,
      emitProgress,
      reportError
    });

    // The persisted ui snapshot may still hold this collection's .bru tabs (renderer
    // snapshot saves are debounced); clear them so a later restore can't resurrect them.
    try {
      snapshotManager.setCollection(collectionPathname, { tabs: [] });
    } catch (snapshotError) {
      console.error('Failed to clear snapshot tabs after migration:', snapshotError);
    }

    await reopenCollection();
    return { brunoConfig: result.brunoConfig };
  } catch (error) {
    await reopenCollection();
    throw error;
  } finally {
    migrationCancellations.delete(collectionUid);
  }
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
  MIGRATION_CANCELLED_MESSAGE
};
