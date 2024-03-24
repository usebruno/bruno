/**
 * The interpolation function expects a string with placeholders and an object with the values to replace the placeholders.
 * The keys passed can have dot notation too.
 *
 * Ex: interpolate('Hello, my name is ${user.name} and I am ${user.age} years old', {
 *  "user.name": "Bruno",
 *  "user": {
 *   "age": 4
 *  }
 * });
 * Output: Hello, my name is Bruno and I am 4 years old
 */

import { flattenObject } from '../utils';

const interpolate = (str: string, obj: Record<string, any>, isJsonBody = false): string => {
  if (!str || typeof str !== 'string' || !obj || typeof obj !== 'object') {
    return str;
  }

  const patternRegex = /\{\{([^}]+)\}\}/g;
  const flattenedObj = flattenObject(obj);
  return str.replace(patternRegex, (match, placeholder) => {
    const replacement = flattenedObj[placeholder] || obj[placeholder];
    // Return the original string so nothing gets replaced
    if (replacement === undefined) {
      return match;
    }

    // When inside json body everything must be encoded so string get double quotes
    if (isJsonBody || typeof replacement === 'object') {
      return JSON.stringify(replacement);
    }
    return replacement;
  });
};

export default interpolate;
