/**
 * Shared name/filename utilities.
 *
 * Single source of truth for sanitizing display names into filesystem-safe
 * names and validating names. Consumed by the Electron main process and the
 * renderer (and re-exported from each package's local helper so existing import
 * paths keep working). Collision-suffix resolution (`nextSuffixedName`) lives in
 * the Electron filesystem utils, since that's the only place collisions are
 * resolved against the real filesystem.
 */

const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g;
const reservedDeviceNames = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i;
const firstCharacter = /^[^\s\-<>:"/\\|?*\x00-\x1F]/; // no leading space, hyphen, or invalid char
const middleCharacters = /^[^<>:"/\\|?*\x00-\x1F]*$/; // no invalid chars anywhere
const lastCharacter = /[^.\s<>:"/\\|?*\x00-\x1F]$/; // no trailing dot, space, or invalid char

/**
 * Make a name safe to use as a filesystem name.
 *
 * Behavior is intentionally unchanged from the previous duplicated copies:
 * interior spaces are preserved; only illegal characters are replaced with `-`,
 * and leading spaces/hyphens and trailing dots/spaces are trimmed.
 */
export const sanitizeName = (name: string): string => {
  return name
    .replace(invalidCharacters, '-') // replace invalid characters with hyphens
    .replace(/^[\s\-]+/, '') // remove leading spaces and hyphens
    .replace(/[.\s]+$/, ''); // remove trailing dots and spaces
};

/**
 * Returns true if `name` is a valid file/dir name.
 *
 * Reconciled version: guards against falsy input (the renderer copy guarded
 * this; the Electron copy did not and would throw on `undefined`).
 */
export const validateName = (name: string): boolean => {
  if (!name) return false;
  if (name.length > 255) return false; // max name length
  if (reservedDeviceNames.test(name)) return false; // windows reserved names

  return firstCharacter.test(name) && middleCharacters.test(name) && lastCharacter.test(name);
};

/**
 * Human-readable validation error for `name`, or '' if valid.
 */
export const validateNameError = (name: string): string => {
  if (!name) return 'Name cannot be empty.';

  if (name.length > 255) {
    return 'Name cannot exceed 255 characters.';
  }

  if (reservedDeviceNames.test(name)) {
    return 'Name cannot be a reserved device name.';
  }

  if (!firstCharacter.test(name[0])) {
    return `Special characters aren't allowed in the name. Invalid character '${name[0]}'.`;
  }

  for (let i = 1; i < name.length - 1; i++) {
    if (!middleCharacters.test(name[i])) {
      return `Special characters aren't allowed in the name. Invalid character '${name[i]}'.`;
    }
  }

  if (!lastCharacter.test(name[name.length - 1])) {
    return `Special characters aren't allowed in the name. Invalid character '${name[name.length - 1]}'.`;
  }

  return '';
};
