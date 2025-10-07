import lightTheme from 'themes/light';

/**
 * Validate that a theme has at least all keys & subkeys from the reference.
 * Extra keys in theme are ignored.
 * Allows final leaf values to be either string OR number.
 */
export function validateThemeShape(theme, reference = lightTheme, path = '') {
  for (const key of Object.keys(reference)) {
    const currentPath = path ? `${path}.${key}` : key;

    // Required key is missing
    if (!(key in theme)) {
      return { valid: false, message: `Missing key: ${currentPath}` };
    }

    const refVal = reference[key];
    const themeVal = theme[key];

    // If ref is an object, recurse into its children
    if (typeof refVal === 'object' && refVal !== null) {
      if (typeof themeVal !== 'object' || themeVal === null) {
        return { valid: false, message: `Key "${currentPath}" must be an object` };
      }
      const res = validateThemeShape(themeVal, refVal, currentPath);
      if (!res.valid) return res;
    } else {
      // Leaf values can be string OR number
      if (
        typeof themeVal !== 'string'
        && typeof themeVal !== 'number'
      ) {
        return {
          valid: false,
          message: `Key "${currentPath}" must be a string or number`
        };
      }
    }
  }

  // Ignore any extra keys present in the theme
  return { valid: true };
}
