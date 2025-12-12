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
const MOCK_DATA_PATTERN = /\{\{\$(\w+)\}\}/g;
// regex to match {{variableName}}
const PLACEHOLDER_PATTERN = /\{\{([^}]+)\}\}/g;
// non-global version for .test() to avoid state pollution
const PLACEHOLDER_TEST_PATTERN = /\{\{([^}]+)\}\}/;

const escapeJSONString = (str: string): string => {
  if (!/[\\\n\r\t\"]/.test(str)) {
    return str;
  }

  return str
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\"/g, '\\"');
};

const processMockData = (replacement: string, escapeJSONStrings: boolean): string => {
  return replacement.replace(MOCK_DATA_PATTERN, (match, keyword) => {
    let mockReplacement = mockDataFunctions[keyword as keyof typeof mockDataFunctions]?.();

    if (mockReplacement === undefined) {
      return match;
    }

    mockReplacement = String(mockReplacement);

    return escapeJSONStrings ? escapeJSONString(mockReplacement) : mockReplacement;
  });
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

  str = processMockData(str, escapeJSONStrings ?? false);

  if (!obj || typeof obj !== 'object') {
    return str;
  }

  return replace(str, obj, new Set<string>(), new Map<string, string>(), escapeJSONStrings ?? false);
};

const replace = (
  str: string,
  obj: Record<string, any>,
  visited = new Set<string>(),
  results = new Map<string, string>(),
  escapeJSONStrings = false
): string => {
  let resultStr = str;
  let matchFound;

  do {
    matchFound = false;
    resultStr = resultStr.replace(PLACEHOLDER_PATTERN, (match, placeholder) => {
      let replacement = get(obj, placeholder);
      if (typeof replacement === 'object' && replacement !== null) {
        replacement = JSON.stringify(replacement);
      }

      if (results.has(match)) {
        return results.get(match);
      }

      // Process mock data functions ({{$keyword}}) in the replacement value
      if (typeof replacement === 'string') {
        replacement = processMockData(replacement, escapeJSONStrings);
      }

      // Check for nested placeholders using non-global regex to avoid state pollution
      const hasNestedPlaceholders = typeof replacement === 'string' && PLACEHOLDER_TEST_PATTERN.test(replacement);
      if (hasNestedPlaceholders && !visited.has(match)) {
        visited.add(match);
        const result = replace(replacement, obj, visited, results, escapeJSONStrings);
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
