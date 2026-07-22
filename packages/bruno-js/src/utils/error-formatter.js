const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { NODEVM_SCRIPT_WRAPPER_OFFSET, QUICKJS_SCRIPT_WRAPPER_OFFSET } = require('./sandbox');

const posixifyPath = (p) => (p ? p.replace(/\\/g, '/') : p);

const DEFAULT_CONTEXT_LINES = 5;
const ALLOWED_SOURCE_EXTENSIONS = ['.bru', '.yml'];

const isAllowedSourceFile = (filePath) =>
  typeof filePath === 'string' && ALLOWED_SOURCE_EXTENSIONS.some((ext) => filePath.endsWith(ext));

const SCRIPT_TYPES = Object.freeze({
  PRE_REQUEST: 'pre-request',
  POST_RESPONSE: 'post-response',
  TEST: 'test'
});

// Bruno script types → OpenCollection YAML script types
const SCRIPT_TYPE_TO_YML = {
  [SCRIPT_TYPES.PRE_REQUEST]: 'before-request',
  [SCRIPT_TYPES.POST_RESPONSE]: 'after-response',
  [SCRIPT_TYPES.TEST]: 'tests'
};

const readFile = (filePath, cache = null) => {
  if (cache?.has(filePath)) return cache.get(filePath);
  try {
    const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
    if (cache) cache.set(filePath, content);
    return content;
  } catch {
    return null;
  }
};

const BLOCK_PATTERNS = {
  [SCRIPT_TYPES.PRE_REQUEST]: /^script:pre-request\s*\{/,
  [SCRIPT_TYPES.POST_RESPONSE]: /^script:post-response\s*\{/,
  [SCRIPT_TYPES.TEST]: /^tests\s*\{/
};

/** Find the 1-indexed line where a script block's content starts in a .bru file */
const findScriptBlockStartLine = (filePath, scriptType, cache = null) => {
  if (!filePath.endsWith('.bru')) return null;

  const cacheKey = `bru:${filePath}:${scriptType}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey);

  const content = readFile(filePath, cache);
  if (!content) return null;

  const pattern = BLOCK_PATTERNS[scriptType];
  if (!pattern) return null;

  const lines = content.split('\n');
  let result = null;
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      result = i + 2; // +1 for 1-indexing, +1 for line after opening brace
      break;
    }
  }

  if (cache) cache.set(cacheKey, result);
  return result;
};

/** Find the 1-indexed last content line of a script block in a .bru file (excludes closing }) */
const findScriptBlockEndLine = (filePath, scriptType, cache = null) => {
  if (!filePath.endsWith('.bru')) return null;

  const cacheKey = `bru-end:${filePath}:${scriptType}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey);

  const content = readFile(filePath, cache);
  if (!content) return null;

  const pattern = BLOCK_PATTERNS[scriptType];
  if (!pattern) return null;

  const lines = content.split('\n');
  let inBlock = false;
  let hasContent = false;
  let result = null;
  for (let i = 0; i < lines.length; i++) {
    if (!inBlock && pattern.test(lines[i])) {
      inBlock = true;
      continue;
    }
    if (inBlock) {
      if (/^\}/.test(lines[i])) {
        // Closing brace at 0-indexed position i; last content line is at 0-indexed (i-1) = 1-indexed i
        result = hasContent ? i : null;
        break;
      }
      hasContent = true;
    }
  }

  if (cache) cache.set(cacheKey, result);
  return result;
};

/** Find the 1-indexed line where a script block's content starts in a .yml file */
const findYmlScriptBlockStartLine = (filePath, scriptType, cache = null) => {
  if (!filePath.endsWith('.yml')) return null;

  const cacheKey = `yml:${filePath}:${scriptType}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey);

  const content = readFile(filePath, cache);
  if (!content) return null;

  const ymlType = SCRIPT_TYPE_TO_YML[scriptType];
  if (!ymlType) return null;

  let result = null;
  try {
    const lineCounter = new YAML.LineCounter();
    const doc = YAML.parseDocument(content, { lineCounter });

    // Request yml files use runtime.scripts, collection/folder yml files use request.scripts
    const scriptPaths = [['runtime', 'scripts'], ['request', 'scripts']];
    for (const scriptPath of scriptPaths) {
      const scripts = doc.getIn(scriptPath, true);
      if (YAML.isSeq(scripts)) {
        for (const item of scripts.items) {
          if (!YAML.isMap(item)) continue;
          if (item.get('type') === ymlType) {
            const codeNode = item.get('code', true);
            if (codeNode && codeNode.range) {
              result = lineCounter.linePos(codeNode.range[0]).line + 1;
              break;
            }
          }
        }
        if (result != null) break;
      }
    }
  } catch {
    // invalid YAML
  }

  if (cache) cache.set(cacheKey, result);
  return result;
};

/** Find the 1-indexed last content line of a script block in a .yml file */
const findYmlScriptBlockEndLine = (filePath, scriptType, cache = null) => {
  if (!filePath.endsWith('.yml')) return null;

  const cacheKey = `yml-end:${filePath}:${scriptType}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey);

  const content = readFile(filePath, cache);
  if (!content) return null;

  const ymlType = SCRIPT_TYPE_TO_YML[scriptType];
  if (!ymlType) return null;

  let result = null;
  try {
    const lineCounter = new YAML.LineCounter();
    const doc = YAML.parseDocument(content, { lineCounter });

    const scriptPaths = [['runtime', 'scripts'], ['request', 'scripts']];
    for (const scriptPath of scriptPaths) {
      const scripts = doc.getIn(scriptPath, true);
      if (YAML.isSeq(scripts)) {
        for (const item of scripts.items) {
          if (!YAML.isMap(item)) continue;
          if (item.get('type') === ymlType) {
            const codeNode = item.get('code', true);
            if (codeNode && codeNode.range) {
              // range[1] is the end offset; go back 1 to get the last content character
              const endOffset = Math.max(codeNode.range[1] - 1, codeNode.range[0]);
              result = lineCounter.linePos(endOffset).line;
              break;
            }
          }
        }
        if (result != null) break;
      }
    }
  } catch {
    // invalid YAML
  }

  if (cache) cache.set(cacheKey, result);
  return result;
};

/** Adjust a runtime-reported line number to the actual line in the .bru/.yml file */
const adjustLineNumber = (filePath, reportedLine, isQuickJS, scriptType = null, cache = null, scriptMetadata = null) => {
  const isBruFile = filePath.endsWith('.bru');
  const isYmlFile = filePath.endsWith('.yml');

  if (!isBruFile && !isYmlFile) {
    return reportedLine;
  }

  const wrapperOffset = isQuickJS ? QUICKJS_SCRIPT_WRAPPER_OFFSET : NODEVM_SCRIPT_WRAPPER_OFFSET;
  const scriptRelativeLine = reportedLine - wrapperOffset;

  if (scriptRelativeLine < 1) return reportedLine;

  // Use metadata if available to correctly map line numbers in combined scripts
  if (scriptType && scriptMetadata) {
    const { requestStartLine, requestEndLine } = scriptMetadata;
    if (requestStartLine != null && requestEndLine != null) {
      if (scriptRelativeLine >= requestStartLine && scriptRelativeLine <= requestEndLine) {
        // Error is within the request script segment
        const blockStartLine = isBruFile
          ? findScriptBlockStartLine(filePath, scriptType, cache)
          : findYmlScriptBlockStartLine(filePath, scriptType, cache);

        if (blockStartLine) {
          return blockStartLine + (scriptRelativeLine - requestStartLine) - 1;
        }
      } else {
        // Error is in a collection/folder-level script
        // Cannot map to the request .bru/.yml file, return null to skip source context.
        return null;
      }
    }
  }

  // No segment metadata, map script-relative line to file line via block start.
  if (scriptType) {
    const blockStartLine = isBruFile
      ? findScriptBlockStartLine(filePath, scriptType, cache)
      : findYmlScriptBlockStartLine(filePath, scriptType, cache);

    if (blockStartLine) {
      return blockStartLine + scriptRelativeLine - 1;
    }
  }

  return scriptRelativeLine;
};

/** Look up the script block start line for a .bru or .yml file */
const findBlockStart = (filePath, scriptType, cache) => {
  if (filePath.endsWith('.bru')) return findScriptBlockStartLine(filePath, scriptType, cache);
  if (filePath.endsWith('.yml')) return findYmlScriptBlockStartLine(filePath, scriptType, cache);
  return null;
};

/**
 * Resolve an error in a collection/folder script segment to its source file and line.
 * Uses the segments array in metadata to find which segment the error falls in,
 * then maps to the actual line in that segment's source file.
 */
const resolveSegmentError = (parsed, metadata, scriptType, cache) => {
  if (!metadata?.segments?.length || !parsed) return null;

  const wrapperOffset = parsed.isQuickJS ? QUICKJS_SCRIPT_WRAPPER_OFFSET : NODEVM_SCRIPT_WRAPPER_OFFSET;
  const scriptRelativeLine = parsed.line - wrapperOffset;
  if (scriptRelativeLine < 1) return null;

  for (const segment of metadata.segments) {
    if (scriptRelativeLine >= segment.startLine && scriptRelativeLine <= segment.endLine) {
      if (!isAllowedSourceFile(segment.filePath)) return null;

      const blockStartLine = findBlockStart(segment.filePath, scriptType, cache);
      if (!blockStartLine) {
        // No script block on disk — only possible when user added a new script as a draft.
        // If we have in-memory content, return it so the caller can show the code snippet.
        if (segment.scriptContent) {
          return {
            line: null,
            filePath: segment.filePath,
            displayPath: segment.displayPath,
            scriptContent: segment.scriptContent,
            // segment.startLine points to the IIFE wrapper line (`await (async () => {`),
            // so subtracting it yields a 1-based index into the user's script content.
            lineInScript: scriptRelativeLine - segment.startLine
          };
        }
        return null;
      }

      return {
        line: blockStartLine + (scriptRelativeLine - segment.startLine) - 1,
        filePath: segment.filePath,
        displayPath: segment.displayPath,
        scriptContent: segment.scriptContent || null,
        // segment.startLine points to the IIFE wrapper line (`await (async () => {`),
        // so subtracting it yields a 1-based index into the user's script content.
        lineInScript: scriptRelativeLine - segment.startLine
      };
    }
  }
  return null;
};

/** Extract file path, line, column, and runtime type from a single stack trace line */
const matchStackFrame = (line) => {
  // QuickJS: "at (/path/to/file.bru:11)" or "at <anonymous> (/path/to/file.bru:11)"
  const quickjsMatch = line.match(/at (?:<[^>]+>\s*)?\(((?:[A-Za-z]:)?[^:]+):(\d+)(?::(\d+))?\)/);
  if (quickjsMatch && (quickjsMatch[1].includes('/') || quickjsMatch[1].includes('\\'))) {
    return {
      filePath: quickjsMatch[1],
      line: parseInt(quickjsMatch[2], 10),
      column: quickjsMatch[3] ? parseInt(quickjsMatch[3], 10) : null,
      isQuickJS: true
    };
  }

  // Node VM: "at /path/to/file.bru:11:5" or "at Object.<anonymous> (/path/to/file.bru:11:5)"
  const nodeMatch = line.match(/at (?:.*?\()?((?:[A-Za-z]:)?[^:]+):(\d+)(?::(\d+))?\)?/);
  if (nodeMatch && (nodeMatch[1].includes('/') || nodeMatch[1].includes('\\'))) {
    return {
      filePath: nodeMatch[1],
      line: parseInt(nodeMatch[2], 10),
      column: nodeMatch[3] ? parseInt(nodeMatch[3], 10) : null,
      isQuickJS: false
    };
  }

  return null;
};

/** Parse the first stack frame to extract file path, line, and column */
const parseStackTrace = (stack) => {
  if (!stack) return null;

  for (const line of stack.split('\n')) {
    const match = matchStackFrame(line);
    if (match) return match;
  }

  return null;
};

const parseErrorLocation = (error) => {
  if (error.__callSites?.length > 0) {
    const first = error.__callSites[0];
    return {
      filePath: first.filePath,
      line: first.line,
      column: first.column,
      isQuickJS: false
    };
  }

  /* falls back to string parsing */
  const parsed = parseStackTrace(error.stack);
  if (parsed && error.__isQuickJS) {
    parsed.isQuickJS = true;
  }
  return parsed;
};

/** Build a context-lines object from an array of source lines around an error */
const buildContextLines = (lines, errorLine, contextLines) => {
  if (errorLine < 1 || errorLine > lines.length) return null;

  const startLine = Math.max(1, errorLine - contextLines);
  const endLine = Math.min(lines.length, errorLine + contextLines);

  const contextLinesArray = [];
  for (let i = startLine; i <= endLine; i++) {
    contextLinesArray.push({
      lineNumber: i,
      content: lines[i - 1],
      isError: i === errorLine
    });
  }

  return { lines: contextLinesArray, startLine, errorLine };
};

/** Read source file and extract context lines around the error location */
const getSourceContext = (filePath, errorLine, contextLines = DEFAULT_CONTEXT_LINES, cache = null) => {
  const content = readFile(filePath, cache);
  if (!content) return null;
  return buildContextLines(content.split('\n'), errorLine, contextLines);
};

/** Extract context lines from in-memory script content (e.g. unsaved draft scripts) */
const getSourceContextFromContent = (content, errorLine, contextLines = DEFAULT_CONTEXT_LINES) => {
  if (!content) return null;
  return buildContextLines(content.split('\n'), errorLine, contextLines);
};

/** Build adjusted stack trace string from structured CallSite data */
const buildStackFromCallSites = (callSites, scriptType = null, cache = null, scriptMetadata = null) => {
  return callSites.map((site) => {
    const adjusted = adjustLineNumber(site.filePath, site.line, false, scriptType, cache, scriptMetadata);
    let fileToUse = site.filePath;
    let lineToUse = adjusted !== null ? adjusted : site.line;

    // Try segment resolution for collection/folder frames
    if (adjusted === null && scriptMetadata?.segments) {
      const parsed = { line: site.line, isQuickJS: false };
      const resolved = resolveSegmentError(parsed, scriptMetadata, scriptType, cache);
      if (resolved && resolved.line !== null) {
        fileToUse = resolved.filePath;
        lineToUse = resolved.line;
      }
    }

    const loc = site.column ? `${fileToUse}:${lineToUse}:${site.column}` : `${fileToUse}:${lineToUse}`;
    const name = site.functionName ? `${site.functionName} (${loc})` : loc;
    return `    at ${name}`;
  }).join('\n');
};

/** Adjust all line numbers in a stack trace string */
const adjustStackTrace = (stack, scriptType = null, cache = null, scriptMetadata = null, forceQuickJS = false) => {
  if (!stack) return stack;

  return stack.split('\n').map((line) => {
    const match = matchStackFrame(line);
    if (!match) return line;

    const isQuickJS = forceQuickJS || match.isQuickJS;
    const adjusted = adjustLineNumber(match.filePath, match.line, isQuickJS, scriptType, cache, scriptMetadata);

    // Try segment resolution for collection/folder frames
    if (adjusted === null && scriptMetadata?.segments) {
      const parsed = { line: match.line, isQuickJS };
      const resolved = resolveSegmentError(parsed, scriptMetadata, scriptType, cache);
      if (resolved && resolved.line !== null) {
        const suffix = match.isQuickJS ? ')' : '';
        return match.column !== null
          ? line.replace(`${match.filePath}:${match.line}:${match.column}${suffix}`, `${resolved.filePath}:${resolved.line}:${match.column}${suffix}`)
          : line.replace(`${match.filePath}:${match.line}${suffix}`, `${resolved.filePath}:${resolved.line}${suffix}`);
      }
      return line;
    }

    if (adjusted === null || adjusted === match.line) return line;

    const suffix = match.isQuickJS ? ')' : '';
    return match.column !== null
      ? line.replace(`:${match.line}:${match.column}${suffix}`, `:${adjusted}:${match.column}${suffix}`)
      : line.replace(`:${match.line}${suffix}`, `:${adjusted}${suffix}`);
  }).join('\n');
};

/** Resolve original error name from wrapped errors (QuickJS cause / Node VM ScriptError) */
const getErrorTypeName = (error) => {
  return error.cause?.name || error.originalError?.name || error.name || error.constructor?.name || 'Error';
};

/** Format an error with source context and adjusted line numbers */
const formatErrorWithContext = (error, relativeFilePath = null, scriptType = null, contextLines = DEFAULT_CONTEXT_LINES, scriptMetadata = null) => {
  if (!error) return '';

  const cache = new Map();
  // Use metadata from error object if available, otherwise use passed parameter
  const metadata = error.scriptMetadata || scriptMetadata;

  const parsed = parseErrorLocation(error);
  if (!parsed) {
    return `${error.message}\n${error.stack || ''}`;
  }

  const { filePath } = parsed;
  const adjustedLine = adjustLineNumber(filePath, parsed.line, parsed.isQuickJS, scriptType, cache, metadata);

  // adjustedLine === null means the error is in a collection/folder script
  // resolve to the collection/folder source file using segment metadata
  let segmentResult = null;
  if (adjustedLine === null) {
    segmentResult = resolveSegmentError(parsed, metadata, scriptType, cache);
    if (!segmentResult) {
      // Fallback: no segment resolution possible, show message + stack only
      const errorType = getErrorTypeName(error);
      const parts = [`${errorType}: ${error.message}`];
      if (error.__callSites?.length > 0) {
        parts.push(buildStackFromCallSites(error.__callSites, scriptType, cache, metadata));
      } else if (error.stack) {
        const stackLines = error.stack.split('\n').slice(1);
        for (const stackLine of stackLines) {
          parts.push(`    ${stackLine.trim()}`);
        }
      }
      return parts.join('\n');
    }
  }

  const sourceFile = segmentResult ? segmentResult.filePath : filePath;
  const sourceLine = segmentResult ? segmentResult.line : adjustedLine;
  const context = isAllowedSourceFile(sourceFile) ? getSourceContext(sourceFile, sourceLine, contextLines, cache) : null;

  if (!context) {
    return `${error.message}\n${error.stack || ''}`;
  }

  const displayPath = segmentResult ? segmentResult.displayPath : (relativeFilePath || filePath);
  const lines = [];

  lines.push(`File: ${displayPath}`);
  lines.push('');

  const maxLineNumber = context.lines[context.lines.length - 1].lineNumber;
  const lineNumberWidth = String(maxLineNumber).length;

  for (const lineInfo of context.lines) {
    const lineNum = String(lineInfo.lineNumber).padStart(lineNumberWidth, ' ');
    const prefix = lineInfo.isError ? '>' : ' ';

    lines.push(`${prefix} ${lineNum} |  ${lineInfo.content}`);
  }

  lines.push('');

  const errorType = getErrorTypeName(error);
  lines.push(`${errorType}: ${error.message}`);

  if (error.__callSites?.length > 0) {
    lines.push(buildStackFromCallSites(error.__callSites, scriptType, cache, metadata));
  } else {
    const stackToDisplay = adjustStackTrace(error.stack, scriptType, cache, metadata, parsed.isQuickJS);
    const userStackLines = stackToDisplay.split('\n').slice(1);
    for (const stackLine of userStackLines) {
      lines.push(`    ${stackLine.trim()}`);
    }
  }

  return lines.join('\n');
};

/**
 * Build a structured error context object for the desktop UI's ScriptError component.
 *
 * formatErrorWithContext (V1) returns a pre-formatted string for CLI output.
 * This function returns a structured object so the desktop UI can render it
 * with its own layout (CodeSnippet component, collapsible stack, etc.).
 *
 * Key difference: line numbers in the returned object are block-relative
 * (i.e. relative to the script block, starting at 1) rather than absolute
 * file line numbers, because users edit scripts in a CodeMirror editor that
 * starts numbering at line 1.
 *
 * @example
 * Given a .bru file at /home/user/my-collection/requests/get-user.bru:
 *
 *   meta {                          ← file line 1
 *     name: get-user                ← file line 2
 *   }                               ← file line 3
 *                                   ← file line 4
 *   script:post-response {          ← file line 5
 *     const data = res.body;        ← file line 6  (script line 1)
 *     data.missing.prop;            ← file line 7  (script line 2) ← error
 *     console.log(data);            ← file line 8  (script line 3)
 *   }                               ← file line 9
 *
 * formatErrorWithContextV2(error, 'post-response', null, '/home/user/my-collection')
 * → {
 *     errorType: 'TypeError',
 *     filePath: 'requests/get-user.bru',   ← relative to collectionPath
 *     errorLine: 2,                        ← block-relative, not file line 7
 *     lines: [
 *       { lineNumber: 1, content: '  const data = res.body;', isError: false },
 *       { lineNumber: 2, content: '  data.missing.prop;',     isError: true  },
 *       { lineNumber: 3, content: '  console.log(data);',     isError: false }
 *     ],
 *     stack: '    at …/requests/get-user.bru:7:3'
 *   }
 *
 * V1 (formatErrorWithContext) returns a flat string for the same error:
 *   File: requests/get-user.bru
 *
 *    5 |  const data = res.body;
 *  > 6 |  data.missing.prop;
 *    7 |  console.log(data);
 *
 *   TypeError: Cannot read properties of undefined
 *       at …/requests/get-user.bru:7:3
 *
 * @param {Error} error - The error to build context for
 * @param {string} scriptType - 'pre-request' | 'post-response' | 'test'
 * @param {object} scriptMetadata - Optional metadata for line mapping in combined scripts
 * @param {string} collectionPath - Absolute path to the collection root (used to compute relative display paths)
 * @returns {object|null} Structured error context or null
 */
/**
 * Resolve error context, preferring in-memory draft content over disk.
 *
 * Three resolution paths (tried in order):
 * 1. Request-level error with in-memory draft content
 * 2. Segment (collection/folder) error with in-memory draft content
 * 3. Disk-based file read (original behavior)
 *
 * @returns {{ context, fromMemory, draftOnlyBlock }|null}
 */
const resolveErrorContext = ({ adjustedLine, scriptRelativeLine, metadata, segmentResult, filePath, sourceFile, sourceLine, scriptType, cache }) => {
  // Request-level error with in-memory draft content
  if (adjustedLine !== null && metadata?.requestScriptContent) {
    // Check whether the script block exists on disk. When the user added a brand-new
    // script that hasn't been saved yet, findBlockStart returns null and adjustLineNumber
    // returned scriptRelativeLine (not a real .bru file line), so stack frame adjustment
    // would produce misleading results — flag it as draft-only.
    const blockStartLine = findBlockStart(filePath, scriptType, cache);
    const draftOnlyBlock = !blockStartLine && isAllowedSourceFile(filePath);
    // requestStartLine points to the IIFE wrapper line (`await (async () => {`),
    // so subtracting it yields a 1-based index into the user's script content.
    const lineInScript = scriptRelativeLine - metadata.requestStartLine;
    const context = getSourceContextFromContent(metadata.requestScriptContent, lineInScript, 3);
    if (context) return { context, fromMemory: true, draftOnlyBlock };
  }

  // Segment (collection/folder) error with in-memory draft content
  if (adjustedLine === null && segmentResult?.scriptContent) {
    const context = getSourceContextFromContent(segmentResult.scriptContent, segmentResult.lineInScript, 3);
    // segmentResult.line is null when the block doesn't exist on disk
    if (context) return { context, fromMemory: true, draftOnlyBlock: segmentResult.line === null };
  }

  // Fall back to reading from disk
  if (sourceLine !== null) {
    const context = getSourceContext(sourceFile, sourceLine, 3, cache);
    if (context) return { context, fromMemory: false, draftOnlyBlock: false };
  }

  return null;
};

const formatErrorWithContextV2 = (error, scriptType, scriptMetadata, collectionPath) => {
  if (!error) return null;

  try {
    const cache = new Map();
    const metadata = (error.scriptMetadata && Object.keys(error.scriptMetadata).length > 0)
      ? error.scriptMetadata
      : scriptMetadata;
    const parsed = parseErrorLocation(error);
    if (!parsed) return null;

    const { filePath } = parsed;
    const wrapperOffset = parsed.isQuickJS ? QUICKJS_SCRIPT_WRAPPER_OFFSET : NODEVM_SCRIPT_WRAPPER_OFFSET;
    const scriptRelativeLine = parsed.line - wrapperOffset;
    const adjustedLine = adjustLineNumber(filePath, parsed.line, parsed.isQuickJS, scriptType, cache, metadata);

    let sourceFile = filePath;
    let sourceLine = adjustedLine;

    // Handle collection/folder script segments
    let segmentResult = null;
    if (adjustedLine === null) {
      segmentResult = resolveSegmentError(parsed, metadata, scriptType, cache);
      if (!segmentResult) return null;
      sourceFile = segmentResult.filePath;
      sourceLine = segmentResult.line;
    }

    // Resolve context: prefer in-memory draft content, fall back to disk
    const resolved = resolveErrorContext({
      adjustedLine, scriptRelativeLine, metadata, segmentResult,
      filePath, sourceFile, sourceLine, scriptType, cache
    });
    if (!resolved || resolved.context.lines.length === 0) return null;

    const { context, fromMemory, draftOnlyBlock } = resolved;

    const resolvedDisplayPath = posixifyPath(
      collectionPath ? path.relative(collectionPath, sourceFile) : sourceFile
    );

    const errorType = getErrorTypeName(error);
    let stack = null;
    if (error.stack) {
      // When the script block only exists as a draft (not on disk), adjustLineNumber
      // cannot map to real .bru file lines — skip adjustment to preserve original frames.
      const rawStack = draftOnlyBlock
        ? error.stack
        : adjustStackTrace(error.stack, scriptType, cache, metadata, parsed.isQuickJS);
      const stackLines = rawStack.split('\n').slice(1).filter((l) => l.trim().startsWith('at'));
      stack = stackLines.length ? stackLines.map((l) => `    ${l.trim()}`).join('\n') : null;
    }

    // When context came from in-memory content, lines are already block-relative
    if (fromMemory) {
      return {
        errorType,
        filePath: resolvedDisplayPath,
        errorLine: context.errorLine,
        lines: context.lines,
        stack
      };
    }

    // Compute block-relative line numbers for the desktop UI.
    // Users edit scripts in a CodeMirror editor starting at line 1,
    // so show lines relative to the script block, not absolute .bru file lines.
    const blockStartLine = findBlockStart(sourceFile, scriptType, cache);

    const isBru = sourceFile.endsWith('.bru');
    const isYml = sourceFile.endsWith('.yml');
    const blockEndLine = isBru
      ? findScriptBlockEndLine(sourceFile, scriptType, cache)
      : isYml
        ? findYmlScriptBlockEndLine(sourceFile, scriptType, cache)
        : null;

    // If this is a .bru/.yml file but the script block is missing or empty, there's nothing to show
    if ((isBru || isYml) && !blockEndLine) return null;

    const blockOffset = blockStartLine ? blockStartLine - 1 : 0;

    const filteredLines = context.lines
      .filter((l) => {
        const rel = l.lineNumber - blockOffset;
        return rel >= 1 && (!blockEndLine || l.lineNumber <= blockEndLine);
      })
      .map((l) => ({
        lineNumber: l.lineNumber - blockOffset,
        content: l.content,
        isError: l.isError
      }));

    if (filteredLines.length === 0) return null;

    return {
      errorType,
      filePath: resolvedDisplayPath,
      errorLine: sourceLine - blockOffset,
      lines: filteredLines,
      stack
    };
  } catch (e) {
    console.warn('formatErrorWithContextV2 failed:', e);
    return null;
  }
};

module.exports = {
  SCRIPT_TYPES,
  DEFAULT_CONTEXT_LINES,
  parseStackTrace,
  parseErrorLocation,
  buildStackFromCallSites,
  getSourceContext,
  getSourceContextFromContent,
  formatErrorWithContext,
  formatErrorWithContextV2,
  adjustLineNumber,
  resolveSegmentError,
  findScriptBlockStartLine,
  findScriptBlockEndLine,
  findYmlScriptBlockStartLine,
  findYmlScriptBlockEndLine,
  adjustStackTrace,
  getErrorTypeName
};
