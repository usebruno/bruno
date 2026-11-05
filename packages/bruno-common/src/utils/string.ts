export const toDisplayString = (value: unknown, fallback = '', indentation = 2): string => {
  if (value == null || value === '') return fallback;

  if (typeof value === 'string') return value;

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, indentation);
    } catch {
      return fallback;
    }
  }

  return String(value);
};

/**
 * Converts CRLF and lone CR line endings to LF.
 * Non-string input (e.g. a YAML scalar parsed as a number) is returned untouched.
 */
export const normalizeLineEndings = (text: string): string => {
  if (typeof text !== 'string') {
    return text;
  }
  return text.replace(/\r\n?/g, '\n');
};
