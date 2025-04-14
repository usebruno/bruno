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
import { mockDataFunctions } from '../utils/faker-functions';

const interpolate = (
  str: string,
  obj: Record<string, any>,
  options: { escapeJSONStrings?: boolean } = { escapeJSONStrings: false }
): string => {
  if (!str || typeof str !== 'string') {
    return str;
  }

  const { escapeJSONStrings } = options;

  const patternRegex = /\{\{\$(\w+)\}\}/g;
  str = str.replace(patternRegex, (match, keyword) => {
    let replacement = mockDataFunctions[keyword as keyof typeof mockDataFunctions]?.();

    if (replacement === undefined) return match;
    replacement = String(replacement);

    if (!escapeJSONStrings) return replacement;

    // All the below chars inside of a JSON String field
    // will make it invalid JSON. So we will have to escape them with `\`.
    // This is not exhaustive but selective to what faker-js can output.
    if (!/[\\\n\r\t\"]/.test(replacement)) return replacement;
    return replacement
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\"/g, '\\"');
  });

  if (!obj || typeof obj !== 'object') {
    return str;
  }

  const flattenedObj = flattenObject(obj);
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
      const replacement = flattenedObj[placeholder];

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
