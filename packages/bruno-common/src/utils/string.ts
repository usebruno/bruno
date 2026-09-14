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
