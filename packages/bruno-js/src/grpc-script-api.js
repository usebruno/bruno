const { safeParseJSON, isObject } = require('./utils');

/**
 * GrpcMessage — a single gRPC message: `bru.grpc.response.message` (read-only, afterMessageReceive)
 * and `bru.grpc.request.message` (read-write, beforeMessageSend). Backed by accessors so it serves
 * both an incoming and an outgoing message.
 */
class GrpcMessage {
  constructor({ read, write, readOnly, timeStamp } = {}) {
    this._read = typeof read === 'function' ? read : () => null;
    this._write = typeof write === 'function' ? write : null;
    this._timeStamp = typeof timeStamp === 'function' ? timeStamp : () => null;
    this.readOnly = readOnly ?? !this._write;
  }

  _assertWritable(method) {
    if (this.readOnly) {
      throw new Error(`bru.grpc.request.message.${method}() is read-only in this script phase`);
    }
  }

  // ── read ──
  get() {
    return this._read();
  }

  timeStamp() {
    return this._timeStamp();
  }

  // ── write ──
  set(data) {
    this._assertWritable('set');
    this._write(data);
  }

  update(partial) {
    this._assertWritable('update');
    const current = this._read();
    this._write({ ...(current || {}), ...partial });
  }

  clear() {
    this._assertWritable('clear');
    this._write(null);
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
 * received messages (already-decoded objects), read via an accessor so it reflects the latest.
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

  switch (phaseType) {
    case 'beforeCallStart':
      return {
        request: {
          messages: new GrpcMessageList(request, [], { readOnly: true }).expose(),
          metadata: new GrpcMetadataList(request).expose(),
          url: request.url ?? null,
          method: request.method ?? null,
          methodType: request.methodType ?? null,
          authMode: request.auth?.mode ?? null
        }
      };

    case 'beforeMessageSend': {
      const outgoing = phaseData || {};
      return {
        request: {
          message: new GrpcMessage({
            read: () => outgoing.message ?? null,
            write: (value) => {
              outgoing.message = value;
            }
          }),
          metadata: new GrpcMetadataList(request, { readOnly: true }).expose(),
          url: request.url ?? null,
          method: request.method ?? null,
          methodType: request.methodType ?? null,
          authMode: request.auth?.mode ?? null
        }
      };
    }

    case 'afterMessageReceive': {
      const { message, timeStamp } = phaseData || {};
      return {
        request: {
          metadata: new GrpcMetadataList(request, { readOnly: true }).expose(),
          url: request.url ?? null,
          method: request.method ?? null,
          methodType: request.methodType ?? null,
          authMode: request.auth?.mode ?? null
        },
        response: {
          message: new GrpcMessage({
            read: () => message ?? null,
            readOnly: true,
            timeStamp: () => timeStamp ?? null
          })
        }
      };
    }

    case 'afterCallEnd': {
      const { responses, statusCode, statusMessage, trailers, sentMessages } = phaseData || {};
      return {
        request: {
          messages: new GrpcMessageList(request, sentMessages ?? [], { readOnly: true }).expose(),
          metadata: new GrpcMetadataList(request, { readOnly: true }).expose(),
          url: request.url ?? null,
          method: request.method ?? null,
          methodType: request.methodType ?? null,
          authMode: request.auth?.mode ?? null
        },
        response: {
          messages: new GrpcResponseMessageList(() => responses).expose(),
          trailers: new GrpcMetadataList({ headers: trailers ?? {} }, { readOnly: true }).expose(),
          statusCode: statusCode ?? null,
          statusMessage: statusMessage ?? null
        }
      };
    }

    default:
      return undefined;
  }
};

module.exports = buildGrpcScriptApi;
