import { mockDataFunctions } from '../mock';

export const flattenObject = (obj: Record<string, any>, parentKey: string = ''): Record<string, any> => {
  return Object.entries(obj).reduce((acc: Record<string, any>, [key, value]: [string, any]) => {
    const newKey = parentKey ? (Array.isArray(obj) ? `${parentKey}[${key}]` : `${parentKey}.${key}`) : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(acc, flattenObject(value, newKey));
    } else {
      acc[newKey] = value;
    }
    return acc;
  }, {});
};

export const getContentType = (headers: Record<string, string> = {}) => {
  let contentType = '';

  Object.keys(headers).forEach((key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = headers[key];
    }
  });

  return contentType;
};

export const interpolateMockVars = (
  str: string,
): string => {
  const patternRegex = /\{\{\$(\w+)\}\}/g;

  return str.replace(patternRegex, (match, keyword: keyof typeof mockDataFunctions) => {
    if (mockDataFunctions[keyword]) {
      try {
        const replacement = mockDataFunctions[keyword]();
        return replacement !== undefined && replacement !== null ? String(replacement) : match;
      } catch (error) {
        console.warn(`Error executing mock function for keyword "${keyword}":`, error);
        return match;
      }
    } else {
      console.warn(`No mock function found for keyword "${keyword}"`);
      return match;
    }
  });
};