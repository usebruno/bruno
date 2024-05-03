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

  const flattenedObj = flattenObject(obj);

  return replace(str, flattenedObj);
};

const replace = (str: string, flattenedObj: Record<string, any>, matches: Set<string> = new Set<string>()): string => {
  const patternRegex = /\{\{([^}]+)\}\}/g;

  return str.replace(patternRegex, (match, placeholder) => {
    const replacement = flattenedObj[placeholder];

    if (patternRegex.test(replacement) && !matches.has(match)) {
      matches.add(match);
      return replace(replacement, flattenedObj, matches);
    }

    matches.add(match);
    return replacement !== undefined ? replacement : match;
  });
};

export default interpolate;
