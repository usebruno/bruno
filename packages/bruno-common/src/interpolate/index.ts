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

import { Set } from 'typescript';
import { flattenObject } from '../utils';

const interpolate = (str: string, obj: Record<string, any>): string => {
  if (!str || typeof str !== 'string' || !obj || typeof obj !== 'object') {
    return str;
  }

  // have both the flattended version and the original version
  let flattenedObj = { ...obj, ...flattenObject(obj) };

  return replace(str, flattenedObj);
};

const replace = (
  str: string,
  flattenedObj: Record<string, any>,
  visited = new Set<string>(),
  results = new Map<string, string>()
): string => {
  let resultStr = str;
  let matchFound = true;

  while (matchFound) {
    const patternRegex = /\{\{([^}]+)\}\}/g;
    matchFound = false;
    resultStr = resultStr.replace(patternRegex, (match, placeholder) => {
      let replacement = flattenedObj[placeholder];
      if (typeof replacement === 'object' && replacement !== null) {
        replacement = JSON.stringify(replacement, null, 2);
      }

      if (results.has(match)) {
        return results.get(match);
      }

      if (patternRegex.test(replacement) && !visited.has(match)) {
        visited.add(match);
        const result = replace(replacement, flattenedObj, visited, results);
        results.set(match, result);

        matchFound = true;
        return result;
      }

      visited.add(match);
      const result = replacement !== undefined ? replacement : match;
      results.set(match, result);

      matchFound = true;
      return result;
    });
  }

  return resultStr;
};

export default interpolate;