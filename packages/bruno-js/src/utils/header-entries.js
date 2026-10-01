/**
 * The header store behind `req.headerList` and `bru.grpc.request.metadata`.
 *
 * The prepared request carries two views of its headers:
 *
 *   request.headerEntries  [{ key, value, disabled?: true }]  ordered store, what the lists read and write
 *   request.headers        { name: value }                    projection of the enabled entries
 *
 * The object is what transport reads (axios, the gRPC client, interpolation, auth helpers) and what
 * `req.headers` hands to scripts, so it has to stay a plain object with one identity for the whole
 * run. The array is the source of truth for the list API (order, disabled rows). These two helpers
 * keep them in step:
 *
 *   reconcileHeaderEntries  object → entries, run before every list read. Picks up writes the list
 *                           cannot see: `req.headers.x = 'y'`, `req.setHeader()`, auth headers and
 *                           body defaults that prepare adds after building the entries, interpolation.
 *   projectHeaderEntries    entries → object, run after every list write.
 *
 * Disabled entries never have a counterpart in the object, so neither helper touches them.
 * Keys are compared exactly here; case-insensitivity is a property of the list API only.
 */

// defineProperty so a key like `__proto__` becomes an own entry instead of changing the prototype.
const setHeaderKey = (target, key, value) => {
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
};

const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);

/**
 * Bring `entries` in line with `headers`, in place.
 * @param {Array<{ key: string, value: *, disabled?: boolean }>} entries
 * @param {object} headers
 * @returns {Array} the same `entries` array
 */
const reconcileHeaderEntries = (entries, headers) => {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.disabled) continue;
    if (!hasOwn(headers, entry.key)) {
      entries.splice(i, 1);
    } else if (headers[entry.key] !== entry.value) {
      entry.value = headers[entry.key];
    }
  }

  for (const key of Object.keys(headers)) {
    if (!entries.some((entry) => !entry.disabled && entry.key === key)) {
      entries.push({ key, value: headers[key] });
    }
  }

  return entries;
};

/**
 * Bring `headers` in line with the enabled `entries`, in place.
 * @param {Array<{ key: string, value: *, disabled?: boolean }>} entries
 * @param {object} headers
 * @returns {object} the same `headers` object
 */
const projectHeaderEntries = (entries, headers) => {
  const enabledKeys = new Set();

  for (const entry of entries) {
    if (entry.disabled) continue;
    enabledKeys.add(entry.key);
    if (!hasOwn(headers, entry.key) || headers[entry.key] !== entry.value) {
      setHeaderKey(headers, entry.key, entry.value);
    }
  }

  for (const key of Object.keys(headers)) {
    if (!enabledKeys.has(key)) {
      delete headers[key];
    }
  }

  return headers;
};

/**
 * The live store of a writable list. Seeds both views when the request was built without them, so
 * a request carrying only a `headers` object (older callers, unit tests) still works.
 * @param {object} request - The prepared request; `headers` and `headerEntries` are created on demand
 * @returns {Array} the request's reconciled `headerEntries`
 */
const liveHeaderEntries = (request) => {
  request.headers ??= {};
  request.headerEntries ??= [];

  return reconcileHeaderEntries(request.headerEntries, request.headers);
};

/**
 * A static `[{ key, value }]` snapshot for the read-only lists (response headers, response metadata
 * and trailers). Accepts the `[{ name, value }]` display rows the response pane renders or a plain
 * `{ name: value }` map.
 * @param {Array|object} source
 * @returns {Array}
 */
const snapshotHeaderEntries = (source) => {
  if (Array.isArray(source)) {
    return source.map(({ name, value }) => ({ key: name, value }));
  }
  if (source && typeof source === 'object') {
    return Object.entries(source).map(([key, value]) => ({ key, value }));
  }
  return [];
};

module.exports = {
  setHeaderKey,
  reconcileHeaderEntries,
  projectHeaderEntries,
  liveHeaderEntries,
  snapshotHeaderEntries
};
