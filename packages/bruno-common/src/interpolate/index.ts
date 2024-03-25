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
import cancelTokens from '@usebruno/app/src/utils/network/cancelTokens';

const interpolate = (str: string, obj: Record<string, any>): string => {
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

    // Objects must be either JSON encoded or convert to a String via `toString`
    if (typeof replacement === 'object') {
      // Check if the object has a `toString` method like `Moment`
      if (typeof replacement.toString === 'function') {
        try {
          return replacement.toString();
        } catch {}
      }
      return JSON.stringify(replacement);
    }

    return replacement;
  });
};

export default interpolate;
