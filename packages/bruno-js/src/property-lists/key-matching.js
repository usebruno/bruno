/**
 * Case-insensitive string comparison. Non-string operands fall back to strict equality.
 */
const ciEquals = (a, b) =>
  typeof a === 'string' && typeof b === 'string' ? a.toLowerCase() === b.toLowerCase() : a === b;

/**
 * Find the own key of `obj` matching `name` case-insensitively.
 * Returns the original-cased key, or undefined.
 */
const findKeyCI = (obj, name) => {
  if (typeof name !== 'string') return undefined;
  return Object.keys(obj).find((key) => ciEquals(key, name));
};

module.exports = { ciEquals, findKeyCI };
