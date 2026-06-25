/**
 * Replaces the current match in the editor and returns info needed to find
 * the next match after the replacement.
 *
 * @param {CodeMirror.Editor} editor
 * @param {Array}  matches     - current match list
 * @param {number} matchIndex  - index of the match to replace
 * @param {string} replaceText
 * @returns {{ endLine: number, endCh: number }} - end position of the replacement
 */
export function replaceSingle(editor, matches, matchIndex, replaceText) {
  const match = matches[matchIndex];
  editor.replaceRange(replaceText, match.from, match.to);

  const replaceLines = replaceText.split('\n');
  const endLine = match.from.line + replaceLines.length - 1;
  const endCh
    = replaceLines.length === 1
      ? match.from.ch + replaceText.length
      : replaceLines[replaceLines.length - 1].length;

  return { endLine, endCh };
}

/**
 * Replaces all matches in the editor in a single undoable operation.
 * Builds a line offset map in one pass to avoid O(n) indexFromPos calls.
 *
 * @param {CodeMirror.Editor} editor
 * @param {Array}  matches     - full match list
 * @param {string} replaceText
 */
export function replaceAll(editor, matches, replaceText) {
  const originalText = editor.getValue();

  // Single-pass line offset map — avoids 42k indexFromPos B-tree traversals
  const lineOffsets = new Uint32Array(editor.lineCount());
  let line = 1;
  for (let i = 0; i < originalText.length; i++) {
    if (originalText.charCodeAt(i) === 10) {
      lineOffsets[line++] = i + 1;
    }
  }

  let result = '';
  let lastIndex = 0;
  matches.forEach(({ from, to }) => {
    const fromIndex = lineOffsets[from.line] + from.ch;
    const toIndex = lineOffsets[to.line] + to.ch;
    result += originalText.slice(lastIndex, fromIndex) + replaceText;
    lastIndex = toIndex;
  });
  result += originalText.slice(lastIndex);

  // Single replaceRange = one undo step, no per-match change objects
  editor.operation(() => {
    const lastLine = editor.lastLine();
    editor.replaceRange(result, { line: 0, ch: 0 }, { line: lastLine, ch: editor.getLine(lastLine).length });
  });
}
