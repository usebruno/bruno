/**
 * Builds a structured error context object for the desktop UI's ScriptError component.
 * Unlike formatErrorWithContext (bruno-js) which returns a formatted string for CLI output,
 * this module returns a structured object with block-relative line numbers so the desktop
 * editor can highlight errors relative to the script block (starting at line 1).
 *
 * Called from notifyScriptExecution in network/index.js for pre-request, post-response,
 * and test script errors.
 */
const path = require('path');
const { posixifyPath } = require('../../utils/filesystem');
const {
  parseErrorLocation,
  adjustLineNumber,
  resolveSegmentError,
  getSourceContext,
  adjustStackTrace,
  getErrorTypeName,
  findScriptBlockStartLine,
  findScriptBlockEndLine,
  findYmlScriptBlockStartLine,
  findYmlScriptBlockEndLine
} = require('@usebruno/js');

const buildErrorContext = (error, scriptType, itemPathname, collectionPath, scriptMetadata) => {
  if (!error) return null;

  try {
    const cache = new Map();
    const metadata = (error.scriptMetadata && Object.keys(error.scriptMetadata).length > 0)
      ? error.scriptMetadata
      : scriptMetadata;
    const parsed = parseErrorLocation(error);
    if (!parsed) return null;

    const { filePath } = parsed;
    const adjustedLine = adjustLineNumber(filePath, parsed.line, parsed.isQuickJS, scriptType, cache, metadata);

    let sourceFile = filePath;
    let sourceLine = adjustedLine;
    let displayPath = itemPathname ? posixifyPath(path.relative(collectionPath, itemPathname)) : filePath;

    // Handle collection/folder script segments
    if (adjustedLine === null) {
      const segmentResult = resolveSegmentError(parsed, metadata, scriptType, cache);
      if (!segmentResult) return null;
      sourceFile = segmentResult.filePath;
      sourceLine = segmentResult.line;
      displayPath = segmentResult.displayPath || posixifyPath(path.relative(collectionPath, segmentResult.filePath));
    }

    const context = getSourceContext(sourceFile, sourceLine, 3, cache);
    if (!context) return null;

    const errorType = getErrorTypeName(error);
    let stack = null;
    if (error.stack) {
      stack = adjustStackTrace(error.stack, scriptType, cache, metadata, parsed.isQuickJS);
      // Extract only the stack frames (skip the first line which is the error message)
      const stackLines = stack.split('\n').slice(1).filter((l) => l.trim().startsWith('at'));
      stack = stackLines.length ? stackLines.map((l) => `    ${l.trim()}`).join('\n') : null;
    }

    // Compute block-relative line numbers for the desktop UI.
    // Users edit scripts in a CodeMirror editor starting at line 1,
    // so show lines relative to the script block, not absolute .bru file lines.
    const isBru = sourceFile.endsWith('.bru');
    const isYml = sourceFile.endsWith('.yml');

    const blockStartLine = isBru
      ? findScriptBlockStartLine(sourceFile, scriptType, cache)
      : isYml
        ? findYmlScriptBlockStartLine(sourceFile, scriptType, cache)
        : null;

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
      filePath: displayPath,
      errorLine: sourceLine - blockOffset,
      lines: filteredLines,
      stack
    };
  } catch (e) {
    console.warn('buildErrorContext failed:', e);
    return null;
  }
};

module.exports = { buildErrorContext };
