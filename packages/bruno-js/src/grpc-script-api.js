const { SCRIPT_PHASES } = require('@usebruno/common');
const { safeParseJSON, isObject } = require('./utils');

const { BEFORE_CALL_START, BEFORE_MESSAGE_SEND, AFTER_MESSAGE_RECEIVE, AFTER_CALL_END } = SCRIPT_PHASES.GRPC;

/**
 * GrpcMessage — a single read-only gRPC message. `expose()` returns plain data so it logs cleanly:
 * `bru.grpc.request.message` → `{ data }` (beforeMessageSend), `bru.grpc.response.message` →
 * `{ data, timestamp }` (afterMessageReceive). Frozen when read-only.
 */
class GrpcMessage {
  constructor({ read, timestamp, readOnly = true } = {}) {
    this._read = typeof read === 'function' ? read : () => null;
    this._timestamp = typeof timestamp === 'function' ? timestamp : null;
    this.readOnly = readOnly;
  }

  expose() {
    const value = { data: this._read() };
    if (this._timestamp) value.timestamp = this._timestamp();
    return this.readOnly ? Object.freeze(value) : value;
  }
}

/**
 * Base for the gRPC list APIs. `expose()` returns the list's `.all()` value (array or map) with every
 * method attached as a non-enumerable property — so it logs as plain data yet `.get()`/`.count()`/… work.
 */
class GrpcList {
  expose() {
    const value = this.all();
    for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
      if (name === 'constructor') continue;
      if (typeof this[name] !== 'function') continue;
      Object.defineProperty(value, name, {
        value: this[name].bind(this),
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    return value;
  }
}

/**
 * GrpcMessageList — the read-only `bru.grpc.request.messages` API. Wraps an array of message entries
 * (`{ name, content }`, `content` a JSON string) passed as arg 2; parses `content` on read.
 */
class GrpcMessageList extends GrpcList {
  constructor(request, messages = [], { readOnly = false } = {}) {
    super();
    this.request = request;
    this.messages = Array.isArray(messages) ? messages : [];
    this.readOnly = readOnly;
  }

  _parse(entry) {
    return entry ? safeParseJSON(entry.content) : null;
  }

  all() {
    return this.messages.map((entry) => safeParseJSON(entry?.content));
  }

  allMessages() {
    return this.messages.map((entry) => safeParseJSON(entry?.content));
  }

  get(index = 0) {
    return this._parse(this.messages[index]);
  }

  first() {
    return this.get(0);
  }

  last() {
    return this.messages.length ? this._parse(this.messages[this.messages.length - 1]) : null;
  }

  count() {
    return this.messages.length;
  }

  find(predicate) {
    return this.all().find(predicate);
  }

  filter(predicate) {
    return this.all().filter(predicate);
  }

  map(mapper) {
    return this.all().map(mapper);
  }

  each(callback) {
    this.all().forEach(callback);
  }
}

/**
 * GrpcMetadataList — the `bru.grpc.request.metadata` API. Wraps the request's metadata
 * (`request.headers`, a `{ key: value }` map — gRPC's equivalent of HTTP headers).
 */
class GrpcMetadataList extends GrpcList {
  constructor(request, { readOnly = false } = {}) {
    super();
    this.request = request;
    this.readOnly = readOnly;
  }

  _assertWritable(method) {
    if (this.readOnly) {
      throw new Error(`bru.grpc.request.metadata.${method}() is read-only in this script phase`);
    }
  }

  /** Ensure metadata is a plain object, then return it. */
  _metadata() {
    const headers = this.request.headers;
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
      this.request.headers = {};
    }
    return this.request.headers;
  }

  // ── read ──────────────────────────────────────────────────────────────────
  all() {
    return { ...this._metadata() };
  }

  get(key) {
    return this._metadata()[key];
  }

  has(key) {
    return Object.prototype.hasOwnProperty.call(this._metadata(), key);
  }

  count() {
    return Object.keys(this._metadata()).length;
  }

  find(predicate) {
    const metadata = this._metadata();
    const key = Object.keys(metadata).find((k) => predicate(metadata[k], k));
    return key === undefined ? undefined : { key, value: metadata[key] };
  }

  filter(predicate) {
    const metadata = this._metadata();
    return Object.keys(metadata)
      .filter((k) => predicate(metadata[k], k))
      .map((k) => ({ key: k, value: metadata[k] }));
  }

  map(mapper) {
    const metadata = this._metadata();
    return Object.keys(metadata).map((k) => mapper(metadata[k], k));
  }

  each(callback) {
    const metadata = this._metadata();
    Object.keys(metadata).forEach((k) => callback(metadata[k], k));
  }

  // ── write ─────────────────────────────────────────────────────────────────
  set(key, value) {
    this._assertWritable('set');
    this._metadata()[key] = value;
  }

  setAll(data) {
    this._assertWritable('setAll');
    if (!isObject(data)) {
      throw new TypeError('setAll expects an object of key/value pairs');
    }
    this.request.headers = { ...data };
  }

  remove(key) {
    this._assertWritable('remove');
    delete this._metadata()[key];
  }

  clear() {
    this._assertWritable('clear');
    this.request.headers = {};
  }
}

/**
 * GrpcResponseMessageList — the read-only `bru.grpc.response.messages` API. Wraps the server's
 * received messages (each `{ data, timestamp }`), read via an accessor so it reflects the latest.
 */
class GrpcResponseMessageList extends GrpcList {
  constructor(getMessages) {
    super();
    this._getMessages = typeof getMessages === 'function' ? getMessages : () => [];
  }

  _messages() {
    const messages = this._getMessages();
    return Array.isArray(messages) ? messages : [];
  }

  all() {
    return [...this._messages()];
  }

  get(index = 0) {
    return this._messages()[index] ?? null;
  }

  first() {
    return this.get(0);
  }

  last() {
    const messages = this._messages();
    return messages.length ? messages[messages.length - 1] : null;
  }

  count() {
    return this._messages().length;
  }

  find(predicate) {
    return this._messages().find(predicate);
  }

  filter(predicate) {
    return this._messages().filter(predicate);
  }

  map(mapper) {
    return this._messages().map(mapper);
  }

  each(callback) {
    this._messages().forEach(callback);
  }
}

const resolveGrpcAuth = (request) => {
  const headers = request.headers;

  if (request?.oauth2) {
    return 'oauth2';
  } else if (headers?.['Authorization']?.startsWith('Bearer')) {
    return 'bearer';
  } else if (headers?.['Authorization']?.startsWith('Basic') || request?.basicAuth?.username) {
    return 'basic';
  } else if (request?.apiKeyAuthValueForQueryParams) {
    return 'apikey';
  } else if (request?.apiKeyHeaderName && headers?.[request.apiKeyHeaderName] !== undefined) {
    return 'apikey';
  } else if (headers?.['X-WSSE']) {
    return 'wsse';
  } else {
    return 'none';
  }
};

/**
 * The call-level request fields every phase exposes. Metadata is writable only in the
 * BEFORE_CALL_START phase — once the call is in flight, mutating it would have no effect.
 */
const baseRequestView = (request, { metadataReadOnly = true } = {}) => {
  const authMode = resolveGrpcAuth(request);
  return {
    metadata: new GrpcMetadataList(request, { readOnly: metadataReadOnly }).expose(),
    url: request.url ?? null,
    method: request.method ?? null,
    methodType: request.methodType ?? null,
    authMode
  };
};

/** `phaseType` is a phase's `FIELD` — the same value callers pass from the registry. */
const phaseBuilders = new Map([
  [
    BEFORE_CALL_START.FIELD,
    (request) => ({
      request: {
        messages: new GrpcMessageList(request, [], { readOnly: true }).expose(),
        ...baseRequestView(request, { metadataReadOnly: false })
      }
    })
  ],

  [
    BEFORE_MESSAGE_SEND.FIELD,
    (request, phaseData) => ({
      request: {
        message: new GrpcMessage({
          read: () => phaseData.message ?? null,
          readOnly: true
        }).expose(),
        ...baseRequestView(request)
      }
    })
  ],

  [
    AFTER_MESSAGE_RECEIVE.FIELD,
    (request, phaseData) => {
      const { message, timestamp } = phaseData;
      return {
        request: baseRequestView(request),
        response: {
          message: new GrpcMessage({
            read: () => message ?? null,
            timestamp: () => timestamp ?? null,
            readOnly: true
          }).expose()
        }
      };
    }
  ],

  [
    AFTER_CALL_END.FIELD,
    (request, phaseData) => {
      const { responses, statusCode, statusText, trailers, sentMessages, duration } = phaseData;
      return {
        request: {
          messages: new GrpcMessageList(request, sentMessages ?? [], { readOnly: true }).expose(),
          ...baseRequestView(request)
        },
        response: {
          messages: new GrpcResponseMessageList(() => responses).expose(),
          trailers: new GrpcMetadataList({ headers: trailers ?? {} }, { readOnly: true }).expose(),
          statusCode: statusCode ?? null,
          statusText: statusText ?? null,
          duration: duration ?? null
        }
      };
    }
  ]
]);

/**
 * Build the phase-aware `bru.grpc` namespace for a gRPC script.
 *
 * @param {object} args - { phaseType, request, phaseData } (phaseData shape varies by phase)
 * @returns {object|undefined} the `bru.grpc` object, or undefined for unknown phases
 */
const buildGrpcScriptApi = ({ phaseType, request, phaseData } = {}) => {
  if (!request) {
    return undefined;
  }

  const build = phaseBuilders.get(phaseType);
  return build ? build(request, phaseData || {}) : undefined;
};

module.exports = buildGrpcScriptApi;
