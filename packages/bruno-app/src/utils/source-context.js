/**
 * Find the 1-indexed line number where `searchText` first appears in `source`.
 * Returns null if not found.
 */
const findLineInSource = (source, searchText) => {
  if (!source || !searchText) return null;

  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchText)) {
      return i + 1;
    }
  }
  return null;
};

/**
 * Extract context lines around `lineNumber` from `source`.
 * Returns { lines: [{ lineNumber, content, isHighlighted }], highlightedLine }
 * Compatible with CodeSnippet component props.
 */
const getScriptContext = (source, lineNumber, contextLines = 3) => {
  if (!source || !lineNumber || lineNumber < 1) return null;

  const lines = source.split('\n');
  if (lineNumber > lines.length) return null;

  const startLine = Math.max(1, lineNumber - contextLines);
  const endLine = Math.min(lines.length, lineNumber + contextLines);

  const contextLinesArray = [];
  for (let i = startLine; i <= endLine; i++) {
    contextLinesArray.push({
      lineNumber: i,
      content: lines[i - 1],
      isHighlighted: i === lineNumber
    });
  }

  return { lines: contextLinesArray, highlightedLine: lineNumber };
};

export { findLineInSource, getScriptContext };
