import { customAlphabet } from 'nanoid';
import xmlFormat from 'xml-formatter';

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

export const convertToCodeMirrorJson = (obj) => {
  try {
    return JSON5.stringify(obj).slice(1, -1);
  } catch (e) {
    return obj;
  }
};

const isWellFormedXML = (xml) => {
  // Simple basic checks for malformed XML
  const openTagsMatch = xml.match(/<[^/!][^>]*>/g) || [];
  const closeTagsMatch = xml.match(/<\/[^>]*>/g) || [];
  
  // Simple check to see if number of opening tags roughly matches number of closing tags
  // This is a basic heuristic and won't catch all cases but should catch common issues
  if (openTagsMatch.length - closeTagsMatch.length !== 0) {
    return false;
  }
  
  // If we're in a browser environment, we can use DOMParser for better validation
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "application/xml");
      // Check if there was a parsing error
      return !doc.querySelector('parsererror');
    } catch (e) {
      return false;
    }
  }
  
  return true;
};

export const safeParseXML = (str, options) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }
  
  try {
    // Check if the XML is well-formed before attempting to format
    if (!isWellFormedXML(str)) {
      return str; // Return the original string for malformed XML
    }
    
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
  const headersArray = typeof headers === 'object' ? Object.entries(headers) : [];

  if (headersArray.length > 0) {
    let contentType = headersArray
      .filter((header) => header[0].toLowerCase() === 'content-type')
      .map((header) => {
        return header[1];
      });
    if (contentType && contentType.length) {
      if (typeof contentType[0] == 'string' && /^[\w\-]+\/([\w\-]+\+)?json/.test(contentType[0])) {
        return 'application/ld+json';
      } else if (typeof contentType[0] === 'string' && /^image\/svg\+xml/i.test(contentType[0])) {
        return 'image/svg+xml';
      } else if (typeof contentType[0] == 'string' && /^[\w\-]+\/([\w\-]+\+)?xml/.test(contentType[0])) {
        return 'application/xml';
      }

      return contentType[0];
    }
  }

  return '';
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

export const stringifyIfNot = v => typeof v === 'string' ? v : String(v);

export const getEncoding = (headers) => {
  // Parse the charset from content type: https://stackoverflow.com/a/33192813
  const charsetMatch = /charset=([^()<>@,;:"/[\]?.=\s]*)/i.exec(headers?.['content-type'] || '');
  return charsetMatch?.[1];
}