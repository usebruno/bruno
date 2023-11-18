/**
 * @typedef {Array<[string, string | Array<string>]>} Headers
 */

// HACK use a proper cookie parser instead of this bizarre function

/**
 * @param {Headers} headers
 * @returns {Object<string, string>}
 */
export function parseCookiesFromHeaders(headers) {
  const cookies = {};

  for (const [headKey, headValue] of headers) {
    if (headKey.toLowerCase() === 'set-cookie') {
      const cookieStrings = Array.isArray(headValue) ? headValue : [headValue];

      for (const cookie of cookieStrings) {
        const [cookieName, cookieValue] = cookie.split(';')[0].split('=');
        cookies[cookieName] = cookieValue;
      }
    }
  }

  return cookies;
}
