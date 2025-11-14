import { customAlphabet } from 'nanoid';
import xmlFormat from 'xml-formatter';
import { JSONPath } from 'jsonpath-plus';
import fastJsonFormat from 'fast-json-format';
import { format, applyEdits } from 'jsonc-parser';
import { patternHasher } from '@usebruno/common/utils';
import prettierFormat from 'prettier/standalone';
import parserBabel from 'prettier/parser-babel';

// a customized version of nanoid without using _ and -
export const uuid = () => {
  // https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
  const urlAlphabet = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const customNanoId = customAlphabet(urlAlphabet, 21);

  return customNanoId();
};

export const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }
  return new Uint32Array([hash])[0].toString(36);
};

export const waitForNextTick = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), 0);
  });
};

export const safeParseJSON = (str) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};

export const safeStringifyJSON = (obj, indent = false) => {
  if (obj === undefined) {
    return obj;
  }
  try {
    if (indent) {
      return JSON.stringify(obj, null, 2);
    }
    return JSON.stringify(obj);
  } catch (e) {
    return obj;
  }
};

export const safeParseXML = (str, options) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }
  try {
    return xmlFormat(str, options);
  } catch (e) {
    return str;
  }
};

// Remove any characters that are not alphanumeric, spaces, hyphens, or underscores
export const normalizeFileName = (name) => {
  if (!name) {
    return name;
  }

  const validChars = /[^\w\s-]/g;
  const formattedName = name.replace(validChars, '-');

  return formattedName;
};

export const getContentType = (headers) => {
  // Return empty string for invalid headers
  if (!headers || typeof headers !== 'object' || Object.keys(headers).length === 0) {
    return '';
  }

  // Get content-type header value
  const contentTypeHeader = Object.entries(headers)
    .find(([key]) => key.toLowerCase() === 'content-type');

  const contentType = contentTypeHeader && contentTypeHeader[1];

  // Return empty string if no content-type or not a string
  if (!contentType || typeof contentType !== 'string') {
    return '';
  }
  // This pattern matches content types like application/json, application/ld+json, text/json, etc.
  const JSON_PATTERN = /^[\w\-]+\/([\w\-]+\+)?json/;
  // This pattern matches content types like image/svg.
  const SVG_PATTERN = /^image\/svg/i;
  // This pattern matches content types like application/xml, text/xml, application/atom+xml, etc.
  const XML_PATTERN = /^[\w\-]+\/([\w\-]+\+)?xml/;
  // This pattern matches JavaScript content types: application/javascript, text/javascript, application/ecmascript, text/ecmascript
  const JAVASCRIPT_PATTERN = /^(application|text)\/(javascript|ecmascript)/i;

  if (JSON_PATTERN.test(contentType)) {
    return 'application/ld+json';
  } else if (SVG_PATTERN.test(contentType)) {
    return 'image/svg+xml';
  } else if (XML_PATTERN.test(contentType)) {
    return 'application/xml';
  } else if (JAVASCRIPT_PATTERN.test(contentType)) {
    return 'application/javascript';
  }

  return contentType;
};

export const startsWith = (str, search) => {
  if (!str || !str.length || typeof str !== 'string') {
    return false;
  }

  if (!search || !search.length || typeof search !== 'string') {
    return false;
  }

  return str.substr(0, search.length) === search;
};

export const pluralizeWord = (word, count) => {
  return count === 1 ? word : `${word}s`;
};

export const relativeDate = (dateString) => {
  const date = new Date(dateString);
  const currentDate = new Date();

  const difference = currentDate - date;
  const secondsDifference = Math.floor(difference / 1000);
  const minutesDifference = Math.floor(secondsDifference / 60);
  const hoursDifference = Math.floor(minutesDifference / 60);
  const daysDifference = Math.floor(hoursDifference / 24);
  const weeksDifference = Math.floor(daysDifference / 7);
  const monthsDifference = Math.floor(daysDifference / 30);

  if (secondsDifference < 60) {
    return 'Few seconds ago';
  } else if (minutesDifference < 60) {
    return `${minutesDifference} minute${minutesDifference > 1 ? 's' : ''} ago`;
  } else if (hoursDifference < 24) {
    return `${hoursDifference} hour${hoursDifference > 1 ? 's' : ''} ago`;
  } else if (daysDifference < 7) {
    return `${daysDifference} day${daysDifference > 1 ? 's' : ''} ago`;
  } else if (weeksDifference < 4) {
    return `${weeksDifference} week${weeksDifference > 1 ? 's' : ''} ago`;
  } else {
    return `${monthsDifference} month${monthsDifference > 1 ? 's' : ''} ago`;
  }
};

export const humanizeDate = (dateString) => {
  // See this discussion for why .split is necessary
  // https://stackoverflow.com/questions/7556591/is-the-javascript-date-object-always-one-day-off

  if (!dateString || typeof dateString !== 'string') {
    return 'Invalid Date';
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const generateUidBasedOnHash = (str) => {
  const hash = simpleHash(str);

  return `${hash}`.padEnd(21, '0');
};

export const stringifyIfNot = (v) => typeof v === 'string' ? v : String(v);

export const getEncoding = (headers) => {
  // Parse the charset from content type: https://stackoverflow.com/a/33192813
  const charsetMatch = /charset=([^()<>@,;:"/[\]?.=\s]*)/i.exec(headers?.['content-type'] || '');
  return charsetMatch?.[1];
};

export const multiLineMsg = (...messages) => {
  return messages.filter((m) => m !== undefined && m !== null && m !== '').join('\n');
};

export const formatSize = (bytes) => {
  // Handle invalid inputs
  if (isNaN(bytes) || typeof bytes !== 'number') {
    return '0B';
  }

  if (bytes < 1024) {
    return bytes + 'B';
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + 'KB';
  }
  if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  }

  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
};

export const sortByNameThenSequence = (items) => {
  const isSeqValid = (seq) => Number.isFinite(seq) && Number.isInteger(seq) && seq > 0;

  // Sort folders alphabetically by name
  const alphabeticallySorted = [...items].sort((a, b) => a.name && b.name && a.name.localeCompare(b.name));

  // Extract folders without 'seq'
  const withoutSeq = alphabeticallySorted.filter((f) => !isSeqValid(f['seq']));

  // Extract folders with 'seq' and sort them by 'seq'
  const withSeq = alphabeticallySorted.filter((f) => isSeqValid(f['seq'])).sort((a, b) => a.seq - b.seq);

  const sortedItems = withoutSeq;

  // Insert folders with 'seq' at their specified positions
  withSeq.forEach((item) => {
    const position = item.seq - 1;
    const existingItem = withoutSeq[position];

    // Check if there's already an item with the same sequence number
    const hasItemWithSameSeq = Array.isArray(existingItem)
      ? existingItem?.[0]?.seq === item.seq
      : existingItem?.seq === item.seq;

    if (hasItemWithSameSeq) {
      // If there's a conflict, group items with same sequence together
      const newGroup = Array.isArray(existingItem)
        ? [...existingItem, item]
        : [existingItem, item];

      withoutSeq.splice(position, 1, newGroup);
    } else {
      // Insert item at the specified position
      withoutSeq.splice(position, 0, item);
    }
  });

  // return flattened sortedItems
  return sortedItems.flat();
};

// Memory threshold to prevent crashes when decoding large buffers
const LARGE_BUFFER_THRESHOLD = 50 * 1024 * 1024; // 50 MB

const applyJSONPathFilter = (data, filter) => {
  try {
    return JSONPath({ path: filter, json: data });
  } catch (e) {
    console.warn('Could not apply JSONPath filter:', e.message);
    return data;
  }
};

export const formatResponse = (data, dataBufferString, mode, filter, bufferThreshold = LARGE_BUFFER_THRESHOLD) => {
  if (data === undefined || !dataBufferString || !mode) {
    return '';
  }

  let bufferSize = 0, rawData = '', isVeryLargeResponse = false;
  try {
    const dataBuffer = Buffer.from(dataBufferString, 'base64');
    bufferSize = dataBuffer.length;
    isVeryLargeResponse = bufferSize > bufferThreshold;
    if (!isVeryLargeResponse) {
      rawData = dataBuffer.toString();
    }
  } catch (error) {
    console.warn('Failed to calculate buffer size:', error);
  }

  if (mode.includes('json')) {
    try {
      if (filter) {
        return safeStringifyJSON(applyJSONPathFilter(data, filter), true);
      }
    } catch (error) {}

    if (isVeryLargeResponse) {
      return safeStringifyJSON(data, false);
    }

    try {
      return fastJsonFormat(rawData);
    } catch (error) {}

    if (typeof data === 'string') {
      return data;
    }
    // Try to stringify the data, fallback to String conversion if needed
    const stringified = safeStringifyJSON(data, false);
    return typeof stringified === 'string' ? stringified : String(data);
  }

  if (mode.includes('xml')) {
    if (isVeryLargeResponse) {
      return typeof data === 'string' ? data : safeStringifyJSON(data, false);
    }

    let parsed = safeParseXML(data, { collapseContent: true });
    if (typeof parsed === 'string') {
      return parsed;
    }
    return safeStringifyJSON(parsed, true);
  }

  if (mode.includes('html')) {
    if (isVeryLargeResponse) {
      if (typeof data === 'string') {
        return data;
      }
      if (data === null || data === undefined) {
        return String(data);
      }
      if (typeof data === 'object') {
        return safeStringifyJSON(data, false);
      }
      return String(data);
    }

    // Get HTML string from rawData
    let htmlString = rawData;
    // Prettify HTML
    try {
      return prettifyHtmlString(htmlString);
    } catch (error) {
      return htmlString;
    }
  }

  if (mode.includes('javascript')) {
    if (isVeryLargeResponse) {
      if (typeof data === 'string') {
        return data;
      }
      if (data === null || data === undefined) {
        return String(data);
      }
      if (typeof data === 'object') {
        return safeStringifyJSON(data, false);
      }
      return String(data);
    }

    // Get JavaScript string from rawData
    let jsString = rawData;

    // Prettify JavaScript
    try {
      return prettifyJavaScriptString(jsString);
    } catch (error) {
      return jsString;
    }
  }

  // Handle hex format - return hex representation
  if (mode.includes('hex')) {
    // Check if data is already in hex format
    if (typeof data === 'string' && isHexFormat(data)) {
      // Data is already in hex format, return it as-is
      return data;
    }

    // Data is not in hex format, encode it to hex
    try {
      const dataBuffer = Buffer.from(dataBufferString, 'base64');
      const hexView = formatHexView(dataBuffer);
      return hexView;
    } catch (error) {
      // If buffer conversion fails, try to encode the string data directly
      if (typeof data === 'string') {
        try {
          const stringBuffer = Buffer.from(data, 'utf8');
          return formatHexView(stringBuffer);
        } catch (stringError) {
          return '';
        }
      }
      return '';
    }
  }

  // Handle base64 format - return base64 string as-is
  if (mode.includes('base64')) {
    return dataBufferString;
  }

  // Handle raw format - return data as-is without any formatting
  if (mode.includes('text') || mode.includes('raw')) {
    if (isVeryLargeResponse) {
      if (typeof data === 'string') {
        return data;
      }
      if (data === null || data === undefined) {
        return String(data);
      }
      if (typeof data === 'object') {
        return safeStringifyJSON(data, false);
      }
      return String(data);
    }
    // Return the raw decoded buffer data
    return rawData;
  }

  if (typeof data === 'string') {
    return data;
  }

  return safeStringifyJSON(data, !isVeryLargeResponse);
};

export const prettifyJsonString = (jsonDataString) => {
  if (typeof jsonDataString !== 'string') return jsonDataString;

  try {
    const { hashed, restore } = patternHasher(jsonDataString);
    const edits = format(hashed, undefined, { tabSize: 2, insertSpaces: true });
    const formattedJsonDataStringHashed = applyEdits(hashed, edits);
    const formattedJsonDataString = restore(formattedJsonDataStringHashed);
    return formattedJsonDataString;
  } catch (error) {
    console.log('error formatting json data!');
    console.error(error);
  }
  return jsonDataString;
};

/**
 * Returns the given string value converted to title case.
 * - If the value is falsy, returns an empty string.
 * - Special-case: if the value is 'default', returns 'Default'.
 * - Otherwise, splits the string on whitespace, hyphens, or underscores,
 *   uppercases the first letter of each word, and lowercases the rest.
 *
 * @param {string} str - The input string to convert.
 * @returns {string} - The converted title-case string.
 */

export const toTitleCase = (str) => {
  if (!str) return '';
  if (str === 'default') return 'Default';
  return str
    .split(/[\s-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
// Simple HTML formatter that indents HTML properly
export function prettifyHtmlString(htmlString) {
  if (typeof htmlString !== 'string') return htmlString;

  try {
    // Use xml-formatter which works well for HTML
    return xmlFormat(htmlString, {
      collapseContent: true,
      lineSeparator: '\n',
      whiteSpaceAtEndOfSelfClosingTag: true
    });
  } catch (error) {
    console.log('error formatting html data!');
    console.error(error);
    // Fallback: return original string if formatting fails
    return htmlString;
  }
};

// Simple JavaScript formatter that uses prettier
export function prettifyJavaScriptString(jsString) {
  if (typeof jsString !== 'string') return jsString;

  try {
    return prettierFormat.format(jsString, {
      parser: 'babel',
      plugins: [parserBabel],
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'none',
      printWidth: 120
    });
  } catch (error) {
    // If prettier fails, return the original string
    return jsString;
  }
};

// Safe HTML escaping for webview content
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Check if string contains valid HTML structure
export const isValidHtml = (str) => {
  if (typeof str !== 'string' || !str.trim()) return false;
  return /<\s*html[\s>]/i.test(str);
};

export function formatHexView(buffer) {
  const width = 16;
  let output = '';

  for (let i = 0; i < buffer.length; i += width) {
    const slice = buffer.slice(i, i + width);
    const hex = Array.from(slice)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    const ascii = Array.from(slice)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');

    output += `${i.toString(16).padStart(8, '0')}: ${hex.padEnd(48)} ${ascii}\n`;
  }

  return output;
}

// Function to detect if a string is already in hex format
// Checks if the string looks like hex dump format (with addresses and ASCII) or plain hex
export function isHexFormat(str) {
  if (typeof str !== 'string' || !str.trim()) {
    return false;
  }

  const trimmed = str.trim();

  // Check for hex dump format (e.g., "00000000: 48 65 6C 6C 6F 20 57 6F 72 6C 64 21 00 00 00 00  Hello World!....")
  const hexDumpPattern = /^[0-9a-fA-F]{8}:\s+([0-9a-fA-F]{2}\s+){1,16}/m;
  if (hexDumpPattern.test(trimmed)) {
    return true;
  }

  // Check for plain hex string (only hex characters, possibly with spaces)
  // Remove spaces and check if all characters are hex
  const hexOnly = trimmed.replace(/\s+/g, '');
  if (hexOnly.length > 0 && /^[0-9a-fA-F]+$/i.test(hexOnly)) {
    // Make sure it's not too short (could be a regular number) and has even length
    // or is a reasonable hex representation
    if (hexOnly.length >= 4 && hexOnly.length % 2 === 0) {
      return true;
    }
  }

  return false;
}
