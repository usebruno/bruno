const ENCODING_MAP = new Map([
  ['\n', 'n'],
  ['\r', 'r'],
  [':', 'c'],
  ['\\', '\\'],
  ['~', 'd'],
  ['@', 'a']
]);

const DECODING_MAP = new Map([...ENCODING_MAP.entries()].map(([key, value]) => [value, key]));

/**
 * Replaces a character at a given position in a string
 * @param {string} str The string to modify
 * @param {number} pos The position of the character to replace
 * @param {number} length The length of the character to replace
 * @param {string} replacement The string to replace it with
 * @returns The new string
 */
function spliceString(str, pos, length, replacement) {
  return str.slice(0, pos) + replacement + str.slice(pos + length);
}

/**
 * Encodes a string, so it can be stored in a bruno file
 * @param {string} str The string to encode
 * @returns The encoded string
 */
function encodeString(str) {
  for (let i = 0; i < str.length; i++) {
    if (ENCODING_MAP.has(str[i])) {
      const replacement = ENCODING_MAP.get(str[i]);
      str = spliceString(str, i, 1, '\\' + replacement);
      i++;
    }
  }
  return str;
}

/**
 * Decodes an encoded string from a bruno file
 * @param {string} str The string to decode
 * @returns The decoded string
 */
function decodeString(str) {
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\\' && i !== str.length - 1 && DECODING_MAP.has(str[i + 1])) {
      const replacement = DECODING_MAP.get(str[i + 1]);
      str = spliceString(str, i, 2, replacement);
    }
  }
  return str;
}

module.exports = {
  encodeString,
  decodeString
};
