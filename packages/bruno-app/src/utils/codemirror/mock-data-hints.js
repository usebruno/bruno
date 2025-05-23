import { mockDataFunctions } from '@usebruno/common';

const MOCK_FUNCTION_SUGGESTIONS = Object.keys(mockDataFunctions).map(key => `$${key}`);

export const getMockDataHints = (cm) => {
  const cursor = cm.getCursor();
  const currentString = cm.getRange({ line: cursor.line, ch: 0 }, cursor);

  const match = currentString.match(/\{\{\$(\w*)$/);
  if (!match) return null;

  const wordMatch = match[1];
  if (!wordMatch) return null;

  const suggestions = MOCK_FUNCTION_SUGGESTIONS.filter(name => name.startsWith(`$${wordMatch}`));
  if (!suggestions.length) return null;

  const startPos = { line: cursor.line, ch: currentString.lastIndexOf('{{$') + 2 }; // +2 accounts for `{{`

  return {
    list: suggestions,
    from: startPos,
    to: cm.getCursor(),
  };
};