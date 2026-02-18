const fs = require('fs');
const YAML = require('yaml');
const { NODEVM_WRAPPER_OFFSET, QUICKJS_WRAPPER_OFFSET } = require('../sandbox/wrapper-constants');

const DEFAULT_CONTEXT_LINES = 5;

// Bruno script types → OpenCollection YAML script types
const SCRIPT_TYPE_TO_YML = {
  'pre-request': 'before-request',
  'post-response': 'after-response',
  'test': 'tests'
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
  'pre-request': /^script:pre-request\s*\{/,
  'post-response': /^script:post-response\s*\{/,
  'test': /^tests\s*\{/
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

/** Find the 1-indexed line where a script block's content starts in a .yml file */
const findYmlScriptBlockStartLine = (filePath, scriptType, cache = null) => {
  if (!filePath.endsWith('.yml') && !filePath.endsWith('.yaml')) return null;

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

    const scripts = doc.getIn(['runtime', 'scripts'], true);
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
  const isYmlFile = filePath.endsWith('.yml') || filePath.endsWith('.yaml');

  if (!isBruFile && !isYmlFile) {
    return reportedLine;
  }

  const wrapperOffset = isQuickJS ? QUICKJS_WRAPPER_OFFSET : NODEVM_WRAPPER_OFFSET;
  const scriptRelativeLine = reportedLine - wrapperOffset;

  if (scriptRelativeLine < 1) return reportedLine;

  // Use metadata if available to correctly map line numbers in combined scripts
  if (scriptType && scriptMetadata) {
    const { requestStartLine, requestEndLine } = scriptMetadata;
    if (requestStartLine && scriptRelativeLine >= requestStartLine && scriptRelativeLine <= requestEndLine) {
      const blockStartLine = isBruFile
        ? findScriptBlockStartLine(filePath, scriptType, cache)
        : findYmlScriptBlockStartLine(filePath, scriptType, cache);

      if (blockStartLine) {
        return blockStartLine + (scriptRelativeLine - requestStartLine) - 1;
      }
    } else if (requestStartLine) {
      // Error is in a collection/folder segment — return raw relative line
      return scriptRelativeLine;
    }
  }

  // Fallback to old behavior if no metadata
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
  return parseStackTrace(error.stack);
};

/** Read source file and extract context lines around the error location */
const getSourceContext = (filePath, errorLine, contextLines = DEFAULT_CONTEXT_LINES, cache = null) => {
  const content = readFile(filePath, cache);
  if (!content) return null;

  const lines = content.split('\n');
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

/** Build adjusted stack trace string from structured CallSite data */
const buildStackFromCallSites = (callSites, scriptType = null, cache = null, scriptMetadata = null) => {
  return callSites.map((site) => {
    const adjusted = adjustLineNumber(site.filePath, site.line, false, scriptType, cache, scriptMetadata);
    const loc = site.column ? `${site.filePath}:${adjusted}:${site.column}` : `${site.filePath}:${adjusted}`;
    const name = site.functionName ? `${site.functionName} (${loc})` : loc;
    return `    at ${name}`;
  }).join('\n');
};

/** Adjust all line numbers in a stack trace string */
const adjustStackTrace = (stack, scriptType = null, cache = null, scriptMetadata = null) => {
  if (!stack) return stack;

  return stack.split('\n').map((line) => {
    const match = matchStackFrame(line);
    if (!match) return line;

    const adjusted = adjustLineNumber(match.filePath, match.line, match.isQuickJS, scriptType, cache, scriptMetadata);
    if (adjusted === match.line) return line;

    const suffix = match.isQuickJS ? ')' : '';
    return match.column !== null
      ? line.replace(`:${match.line}:${match.column}${suffix}`, `:${adjusted}:${match.column}${suffix}`)
      : line.replace(`:${match.line}${suffix}`, `:${adjusted}${suffix}`);
  }).join('\n');
};

/** Resolve original error name from wrapped errors (QuickJS cause / Node VM ScriptError) */
const getErrorTypeName = (error) => {
  return error.cause?.name || error.originalError?.name || error.name || error.constructor.name || 'Error';
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
  const context = getSourceContext(filePath, adjustedLine, contextLines, cache);

  if (!context) {
    return `${error.message}\n${error.stack || ''}`;
  }

  const displayPath = relativeFilePath || filePath;
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
    const stackToDisplay = adjustStackTrace(error.stack, scriptType, cache, metadata);
    const userStackLines = stackToDisplay.split('\n').slice(1);
    for (const stackLine of userStackLines) {
      lines.push(`    ${stackLine.trim()}`);
    }
  }

  return lines.join('\n');
};

module.exports = {
  DEFAULT_CONTEXT_LINES,
  parseStackTrace,
  parseErrorLocation,
  buildStackFromCallSites,
  getSourceContext,
  formatErrorWithContext,
  adjustLineNumber,
  findScriptBlockStartLine,
  findYmlScriptBlockStartLine,
  adjustStackTrace,
  getErrorTypeName
};
