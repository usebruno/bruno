export const LONG_LINE_LIMIT = 20000;

export const hasLongLine = (value, limit = LONG_LINE_LIMIT) => {
  const text = String(value ?? '');
  let lineStart = 0;

  for (let index = 0; index <= text.length; index++) {
    const character = text[index];
    if (character === '\n' || character === '\r' || index === text.length) {
      if (index - lineStart > limit) return true;
      lineStart = index + 1;
    }
  }

  return false;
};

export const changeIntroducesLongLine = (change, getLine, limit = LONG_LINE_LIMIT) => {
  const insertedLines = change?.text || [''];
  const firstLine = getLine(change.from.line) || '';
  const lastLine = getLine(change.to.line) || '';
  const prefix = firstLine.slice(0, change.from.ch);
  const suffix = lastLine.slice(change.to.ch);

  if (firstLine.length > limit || lastLine.length > limit) return false;

  if (insertedLines.length === 1) {
    return prefix.length + insertedLines[0].length + suffix.length > limit;
  }

  if (prefix.length + insertedLines[0].length > limit) return true;
  if (insertedLines[insertedLines.length - 1].length + suffix.length > limit) return true;
  return insertedLines.slice(1, -1).some((line) => line.length > limit);
};
