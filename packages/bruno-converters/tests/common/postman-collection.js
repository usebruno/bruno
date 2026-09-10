/**
 * Builds a minimal Postman v2.1 collection around the given items.
 *
 * @param {Array<Object>} items - Postman items (requests or folders), e.g. from {@link makeRequest}.
 * @param {Object} [overrides] - Top-level fields merged over the collection (e.g. `variable`, `auth`).
 * @returns {Object} A collection object as postmanToBruno expects it.
 */
export const makeCollection = (items, overrides = {}) => ({
  info: {
    _postman_id: 'test-id',
    name: 'Test Collection',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: items,
  ...overrides
});

/**
 * The `item.protocolProfileBehavior` fields the Bruno importer reads. Postman types them, but real
 * exports are not guaranteed to honour that, so importer tests pass unexpected values here too.
 * Any other field Postman sends is ignored on import.
 *
 * @typedef {Object} ProtocolProfileBehavior
 * @property {boolean} [followRedirects] - Maps to Bruno's followRedirects setting.
 * @property {number} [maxRedirects] - Maps to Bruno's maxRedirects setting.
 * @property {boolean} [followAuthorizationHeader] - Maps to Bruno's forwardAuthorizationHeader setting.
 * @property {boolean} [disableUrlEncoding] - Inverted into Bruno's encodeUrl setting.
 */

/**
 * Builds a minimal Postman request item.
 *
 * @param {string} name - The request name, also used as the issue path in import warnings.
 * @param {Object} [options]
 * @param {string} [options.method='GET'] - HTTP method.
 * @param {string} [options.url='https://example.com'] - Raw request URL.
 * @param {ProtocolProfileBehavior} [options.protocolProfileBehavior] - Omitted from the item when falsy.
 * @returns {Object} A request item for {@link makeCollection}.
 */
export const makeRequest = (name, { method = 'GET', url = 'https://example.com', protocolProfileBehavior } = {}) => ({
  name,
  ...(protocolProfileBehavior ? { protocolProfileBehavior } : {}),
  request: {
    method,
    header: [],
    url: { raw: url, protocol: 'https', host: ['example', 'com'] }
  }
});
