/**
 * The interpolation function expects a string with placeholders and an object with the values to replace the placeholders.
 * The keys passed can have dot notation too.
 *
 * Ex: interpolate('Hello, my name is ${user.name} and I am ${user.age} years old', {
 *  "user.name": "Bruno",
 *  "user": {
 *   "age": 6
 *  }
 * });
 * Output: Hello, my name is Bruno and I am 6 years old
 */

import { mockDataFunctions } from '../utils/faker-functions';
import { get, isPlainObject, mapValues } from 'lodash-es';

// regex to match {{$keyword}}
const MOCK_PATTERN = /\{\{\$(\w+)\}\}/g;
const JSON_SPECIAL_CHARS = /[\\\n\r\t\"]/;

const escapeJSONString = (str: string): string => {
  if (!JSON_SPECIAL_CHARS.test(str)) {
    return str;
  }

  return str
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\"/g, '\\"');
};

const prepareMock = (str: string, escapeJSONStrings: boolean): string => {
  return str.replace(MOCK_PATTERN, (match, keyword) => {
    let generatedValue = mockDataFunctions[keyword as keyof typeof mockDataFunctions]?.();

    if (generatedValue === undefined) {
      return match;
    }

    generatedValue = String(generatedValue);

    return escapeJSONStrings ? escapeJSONString(generatedValue) : generatedValue;
  });
};

const prepareMockObj = (
  obj: Record<string, any>,
  escapeJSONStrings: boolean
): Record<string, any> => {
  const processed: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      processed[key] = prepareMock(value, escapeJSONStrings);
    } else if (isPlainObject(value)) {
      // plain object is used to skip special objects like Date, RegExp, etc.
      processed[key] = prepareMockObj(value, escapeJSONStrings);
    } else {
      processed[key] = value;
    }
  }

  return processed;
};

const interpolate = (
  str: string,
  obj: Record<string, any>,
  options: { escapeJSONStrings?: boolean } = { escapeJSONStrings: false }
): string => {
  if (!str || typeof str !== 'string') {
    return str;
  }

  const { escapeJSONStrings } = options;

  const preparedStr = prepareMock(str, escapeJSONStrings ?? false);

  if (!obj || typeof obj !== 'object') {
    return preparedStr;
  }
  // process the object with the mock data functions
  const preparedObj = prepareMockObj(obj, escapeJSONStrings ?? false);
  return replace(preparedStr, preparedObj);
};

const replace = (
  str: string,
  obj: Record<string, any>,
  visited = new Set<string>(),
  results = new Map<string, string>()
): string => {
  let resultStr = str;
  let matchFound = true;

  while (matchFound) {
    const patternRegex = /\{\{([^}]+)\}\}/g;
    matchFound = false;
    resultStr = resultStr.replace(patternRegex, (match, placeholder) => {
      let replacement = get(obj, placeholder);
      if (typeof replacement === 'object' && replacement !== null) {
        replacement = JSON.stringify(replacement);
      }

      if (results.has(match)) {
        return results.get(match);
      }

      if (patternRegex.test(replacement) && !visited.has(match)) {
        visited.add(match);
        const result = replace(replacement, obj, visited, results);
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

export const interpolateObject = (obj: unknown, variables: Record<string, any>): unknown => {
  const seen = new WeakSet<object>();
  const walk = (value: unknown): unknown => {
    if (value == null) return value;
    if (typeof value === 'string') {
      return interpolate(value, variables);
    }
    if (typeof value === 'object') {
      if (seen.has(value as object)) {
        throw new Error('Circular reference detected during interpolation.');
      }
      seen.add(value as object);
      try {
        if (Array.isArray(value)) {
          return value.map(walk);
        }
        if (isPlainObject(value)) {
          return mapValues(value as Record<string, unknown>, walk);
        }
        return value;
      } finally {
        seen.delete(value as object);
      }
    }
    return value;
  };
  return walk(obj);
};

export default interpolate;
