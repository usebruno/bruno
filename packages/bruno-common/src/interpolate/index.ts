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
import { get } from 'lodash-es';

// regex to match {{$keyword}}
const MOCK_PATTERN = /\{\{\$(\w+)\}\}/g;
// regex to match {{variableName}} - global for .replace() to match all occurrences
const PLACEHOLDER_GLOBAL = /\{\{([^}]+)\}\}/g;
// non-global version for .test() to check existence without state pollution from /g flag
// https://stackoverflow.com/q/1520800
const PLACEHOLDER_CHECK = /\{\{([^}]+)\}\}/;
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
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
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
  let matchFound = false;

  do {
    resultStr = resultStr.replace(PLACEHOLDER_GLOBAL, (match, placeholder) => {
      let replacement = get(obj, placeholder);
      if (typeof replacement === 'object' && replacement !== null) {
        replacement = JSON.stringify(replacement);
      }

      if (results.has(match)) {
        return results.get(match);
      }

      // Check for nested placeholders using non-global regex to avoid state pollution
      const hasNestedPlaceholders = typeof replacement === 'string' && PLACEHOLDER_CHECK.test(replacement);
      if (hasNestedPlaceholders && !visited.has(match)) {
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
  } while (matchFound);

  return resultStr;
};

export default interpolate;
