/**
 * Response formatting utilities.
 *
 * Kept in a separate module (not re-exported from utils/common/index.js) so that
 * prettier — a large dependency — is only bundled into the chunks that actually
 * render responses (ResponsePane/QueryResult, ResponseCopy, ResponseBookmark),
 * all of which are inside the lazy-loaded RequestTabPanel chunk.
 *
 * DO NOT re-export from utils/common/index.js — that would pull prettier back
 * into the main bundle.
 */

import prettierFormat from 'prettier/standalone';
import parserBabel from 'prettier/parser-babel';
import fastJsonFormat from 'fast-json-format';
import { JSONPath } from 'jsonpath-plus';
import xmlFormat from 'xml-formatter';
import { safeStringifyJSON, safeParseXML, formatHexView, isHexFormat } from 'utils/common';

const LARGE_BUFFER_THRESHOLD = 50 * 1024 * 1024; // 50 MB

const applyJSONPathFilter = (data, filter) => {
  try {
    return JSONPath({ path: filter, json: data });
  } catch (e) {
    console.warn('Could not apply JSONPath filter:', e.message);
    return data;
  }
};

export function prettifyHtmlString(htmlString) {
  if (typeof htmlString !== 'string') return htmlString;

  try {
    return xmlFormat(htmlString, {
      collapseContent: true,
      lineSeparator: '\n',
      whiteSpaceAtEndOfSelfClosingTag: true
    });
  } catch (error) {
    return htmlString;
  }
}

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
    return jsString;
  }
}

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
      if (typeof data === 'string') return data;
      if (data === null || data === undefined) return String(data);
      if (typeof data === 'object') return safeStringifyJSON(data, false);
      return String(data);
    }

    let htmlString = rawData;
    try {
      return prettifyHtmlString(htmlString);
    } catch (error) {
      return htmlString;
    }
  }

  if (mode.includes('javascript')) {
    if (isVeryLargeResponse) {
      if (typeof data === 'string') return data;
      if (data === null || data === undefined) return String(data);
      if (typeof data === 'object') return safeStringifyJSON(data, false);
      return String(data);
    }

    let jsString = rawData;
    try {
      return prettifyJavaScriptString(jsString);
    } catch (error) {
      return jsString;
    }
  }

  if (mode.includes('hex')) {
    if (typeof data === 'string' && isHexFormat(data)) {
      return data;
    }

    try {
      const dataBuffer = Buffer.from(dataBufferString, 'base64');
      return formatHexView(dataBuffer);
    } catch (error) {
      if (typeof data === 'string') {
        try {
          return formatHexView(Buffer.from(data, 'utf8'));
        } catch (stringError) {
          return '';
        }
      }
      return '';
    }
  }

  if (mode.includes('base64')) {
    return dataBufferString;
  }

  if (mode.includes('text') || mode.includes('raw')) {
    if (isVeryLargeResponse) {
      if (typeof data === 'string') return data;
      if (data === null || data === undefined) return String(data);
      if (typeof data === 'object') return safeStringifyJSON(data, false);
      return String(data);
    }
    return rawData;
  }

  if (typeof data === 'string') {
    return data;
  }

  return safeStringifyJSON(data, !isVeryLargeResponse);
};
