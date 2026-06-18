/**
 * Shared name/filename utilities.
 *
 * Single source of truth for sanitizing display names into filesystem-safe
 * names, validating names, and resolving filename collisions. Consumed by the
 * Electron main process and the renderer (and re-exported from each package's
 * local helper so existing import paths keep working).
 */

// Characters that are illegal in file/dir names across Windows/macOS/Linux.
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

/**
 * Build the nth suffixed filename. n === 0 → no suffix.
 *
 *   nextSuffixedName('login', 'bru', 0) -> 'login.bru'
 *   nextSuffixedName('login', 'bru', 2) -> 'login2.bru'
 *   nextSuffixedName('My Folder', '', 1) -> 'My Folder1'
 *
 * This is the single definition of the suffix scheme; the Electron
 * `writeFileUnique` (filesystem authority) uses the same shape so the in-memory
 * resolver and the filesystem resolver can never diverge.
 */
export const nextSuffixedName = (base: string, ext: string, n: number): string => {
  const suffix = n === 0 ? '' : String(n);
  return ext ? `${base}${suffix}.${ext}` : `${base}${suffix}`;
};

export interface ResolveUniqueNameOptions {
  /** Treat names that differ only by case as colliding (default: true). */
  caseInsensitive?: boolean;
}

/**
 * Return the first collision-free filename for `baseName`/`ext`, given the set
 * of names that already exist in the destination, using the `name`, `name1`,
 * `name2`, … scheme.
 *
 * `existingNames` and the returned value are full filenames (including `ext`).
 * For folders pass `ext = ''`.
 *
 * NOTE: this is the pure, in-memory resolver. It is correct against a snapshot
 * but is not race-safe on its own — the Electron path uses an atomic
 * exclusive-create (`writeFileUnique`) as the authority. Keep both in sync via
 * `nextSuffixedName`.
 */
export const resolveUniqueName = (
  baseName: string,
  ext: string,
  existingNames: string[] = [],
  { caseInsensitive = true }: ResolveUniqueNameOptions = {}
): string => {
  const normalize = (s: string): string => (caseInsensitive ? s.toLowerCase() : s);
  const taken = new Set(existingNames.map(normalize));

  for (let n = 0; ; n++) {
    const candidate = nextSuffixedName(baseName, ext, n);
    if (!taken.has(normalize(candidate))) {
      return candidate;
    }
  }
};
