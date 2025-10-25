// Adapted from flat library by Hugh Kennedy (https://github.com/hughsk/flat)
// MIT License

/**
 * Recursively flattens a nested object or array into a flat object with JavaScript-style keys.
 * Arrays use square bracket notation (e.g., items[0].id).
 * Only primitives and null are included as values.
 *
 * @param {object|array} obj - The object or array to flatten.
 * @param {string} [prefix] - Used internally for recursion to build the path.
 * @returns {object} A flat object with JavaScript-style keys.
 */
function flattenObject(obj, prefix = '') {
  // Store the final flat result
  const result = {};

  /**
   * Internal recursive function to process each value.
   * @param {*} value - The current value (can be object, array, primitive, or null)
   * @param {string} path - The JavaScript-style key up to this point
   */
  function step(value, path) {
    // If value is a primitive (string, number, boolean) or null, add it to the result
    if (value === null || typeof value !== 'object') {
      result[path] = value;
      return;
    }

    // If value is an array, iterate over each item by index
    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        // Build the next path with array index using square brackets (e.g. "items[0]")
        step(item, path ? `${path}[${idx}]` : `[${idx}]`);
      });
    } else {
      // If value is an object, iterate over its keys
      Object.entries(value).forEach(([key, val]) => {
        // Build the next path with object key (e.g. "user.name")
        step(val, path ? `${path}.${key}` : key);
      });
    }
  }

  // Start recursive flattening from the root object
  step(obj, prefix);

  // Return the flat result object
  return result;
}

export { flattenObject };
