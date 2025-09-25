/**
 * @param {string} snippet
 * @returns {boolean}
 */
export function isXML(snippet) {
  return /<\/?[a-z][\s\S]*>/i.test(snippet);
}

/**
 * @param {string} snippet
 * @returns {boolean}
 */
export function isJSON(snippet) {
  try {
    JSON.parse(snippet);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * @param {string} snippet
 * @returns {string}
 */
export function autoDetectLang(snippet) {
  if (isJSON(snippet)) {
    return 'json';
  }
  if (isXML(snippet)) {
    return 'xml';
  }
  return 'text';
}
