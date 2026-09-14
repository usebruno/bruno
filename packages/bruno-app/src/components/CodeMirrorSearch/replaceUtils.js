/**
 *
 * @param {CodeMirror.Editor} editor
 * @param {Array}  matches
 * @param {number} matchIndex
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
 *
 * @param {CodeMirror.Editor} editor
 * @param {Array}  matches
 * @param {string} replaceText
 */
export function replaceAll(editor, matches, replaceText) {
  const originalText = editor.getValue();

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

  editor.operation(() => {
    const lastLine = editor.lastLine();
    editor.replaceRange(result, { line: 0, ch: 0 }, { line: lastLine, ch: editor.getLine(lastLine).length });
  });
}
