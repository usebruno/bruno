/**
 * Reads an environment name from untrusted input (an import file). Returns the name as text, or
 * `null` when there is no usable name: a blank string, or anything that is neither a string nor a
 * finite number.
 */
export const coerceEnvName = (name: unknown): string | null => {
  if (typeof name === 'string') {
    return name.trim() === '' ? null : name;
  }
  if (typeof name === 'number' && Number.isFinite(name)) {
    return String(name);
  }
  return null;
};
