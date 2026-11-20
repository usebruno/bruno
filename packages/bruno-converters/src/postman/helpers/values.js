import { toDisplayString } from '@usebruno/common/utils';

/**
 * Coerces Postman's non-string values to strings; empty values yield `fallback`.
 * Objects stay on one line, since they can land in headers and params.
 */
export const ensureString = (value, fallback = '') => toDisplayString(value, fallback, 0);

/**
 * Postman descriptions are either a plain string (legacy) or a `{ content, type }` object.
 */
export const transformDescription = (description) => {
  if (!description) {
    return '';
  }

  if (typeof description === 'string') {
    return description;
  }

  if (typeof description === 'object' && Object.hasOwn(description, 'content')) {
    return ensureString(description.content);
  }

  return '';
};

/**
 * Turns Postman's `[{ key, value }]` credential lists (v2.1, v3) into a plain `{ key: value }`
 * lookup. A plain object is returned as-is.
 */
export const toKeyValueObject = (entries) => {
  if (!Array.isArray(entries)) {
    return entries && typeof entries === 'object' ? entries : {};
  }

  return entries.reduce((accumulator, entry) => {
    if (entry && typeof entry === 'object' && entry.key != null) {
      accumulator[entry.key] = entry.value;
    }
    return accumulator;
  }, {});
};

export const stripUrlFragment = (url) => {
  if (typeof url !== 'string') return '';
  return url.split('#')[0];
};

/**
 * Returns a namer that hands out `name`, then `name_1`, `name_2`, ... for repeated names.
 */
export const createUniqueNamer = () => {
  const takenNames = new Set();

  return (baseName) => {
    let name = baseName;
    let count = 1;

    while (takenNames.has(name)) {
      name = `${baseName}_${count}`;
      count++;
    }

    takenNames.add(name);
    return name;
  };
};
