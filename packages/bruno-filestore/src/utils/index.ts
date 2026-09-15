const { customAlphabet } = require('nanoid');

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNumber = (value: unknown): value is number => typeof value === 'number';

export const isNonEmptyString = (value: unknown): value is string => isString(value) && value.trim().length > 0;

export const ensureString = (value: unknown, fallback: string = ''): string => {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
};

/**
 * Canonicalises an HTTP verb to upper case.
 *
 * HTTP methods are case-sensitive tokens (RFC 9110 S9), and every method
 * registered with IANA is upper case, so `post` is not `POST` to a strict
 * server. Bruno sends requests fine either way, but a lower-case verb that
 * reaches the model leaks into anything that renders the request verbatim -
 * most visibly Generate Code, which emits `curl --request post`.
 *
 * `toUpperCase()` rather than lodash's `_.upperCase`, which strips the
 * special characters that custom methods are allowed to contain.
 */
export const normalizeHttpMethod = (value: unknown, fallback: string = 'GET'): string => {
  const method = ensureString(value, fallback);
  return method.trim().length ? method.toUpperCase() : fallback;
};

export const uuid = () => {
  // https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
  const urlAlphabet = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const customNanoId = customAlphabet(urlAlphabet, 21);

  return customNanoId();
};
