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
 */
export const normalizeLineEndings = (text: string): string => text.replace(/\r\n?/g, '\n');
