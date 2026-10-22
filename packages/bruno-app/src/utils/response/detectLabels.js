import { detectContentTypeFromBase64 } from './index';

const MAX_SCAN_NODES = 2000;
const MAX_SCAN_DEPTH = 6;
const MAX_STRING_LENGTH = 4 * 1024 * 1024;
const MIN_BASE64_LENGTH = 16;

const ZPL_LABEL_REGEX = /\^XA[\s\S]*?\^XZ/gi;
const BASE64_REGEX = /^[A-Za-z0-9+/\r\n]+={0,2}$/;

const CDATA_REGEX = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
const ELEMENT_TEXT_REGEX = />([^<]+)</g;
const NUMERIC_ENTITY_REGEX = /&#(?:x[0-9a-f]+|\d+);/gi;

const decodeBase64 = (str) => {
  try {
    return Buffer.from(str, 'base64').toString('latin1');
  } catch (err) {
    return '';
  }
};

const extractZplLabels = (text) => {
  return (text.match(ZPL_LABEL_REGEX) || []).map((content) => ({ kind: 'zpl', content }));
};

const detectInString = (str) => {
  if (typeof str !== 'string' || str.length === 0 || str.length > MAX_STRING_LENGTH) {
    return [];
  }

  const zpl = extractZplLabels(str);
  if (zpl.length) {
    return zpl;
  }

  if (str.length < MIN_BASE64_LENGTH || !BASE64_REGEX.test(str)) {
    return [];
  }

  if (detectContentTypeFromBase64(str) === 'application/pdf') {
    return [{ kind: 'pdf', content: str }];
  }

  return extractZplLabels(decodeBase64(str));
};

// Text content of each XML element, so a base64 label is checked on its own instead of as part of the whole document
const extractElementTexts = (markup) => {
  const unwrapped = markup.replace(CDATA_REGEX, '$1');
  return [...unwrapped.matchAll(ELEMENT_TEXT_REGEX)]
    .map((match) => match[1].replace(NUMERIC_ENTITY_REGEX, '').trim())
    .filter(Boolean);
};

const collectStrings = (value, out, budget, depth = 0) => {
  if (budget.nodes <= 0 || depth > MAX_SCAN_DEPTH) {
    return;
  }
  budget.nodes--;

  if (typeof value === 'string') {
    if (value.trimStart().startsWith('<') && value.length <= MAX_STRING_LENGTH) {
      out.push(...extractElementTexts(value));
    } else {
      out.push(value);
    }
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out, budget, depth + 1));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectStrings(v, out, budget, depth + 1));
  }
};

/**
 * Detects printable labels (PDF or ZPL) in a response.
 *
 * Looks at the raw body first (PDF magic bytes, ZPL text) and then at string values
 * inside a parsed JSON body or the element texts of an XML body (plain ZPL, or
 * base64-encoded PDF/ZPL).
 *
 * @param {{ data: any, dataBuffer: string }} response - parsed body and base64 raw body
 * @returns {Array<{ kind: 'pdf' | 'zpl', content: string }>} content is base64 for pdf, ZPL text for zpl
 */
export const detectLabels = ({ data, dataBuffer } = {}) => {
  if (dataBuffer && detectContentTypeFromBase64(dataBuffer) === 'application/pdf') {
    return [{ kind: 'pdf', content: dataBuffer }];
  }

  const strings = [];
  collectStrings(data, strings, { nodes: MAX_SCAN_NODES });

  return strings.flatMap(detectInString);
};
