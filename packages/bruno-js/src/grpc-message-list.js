/**
 * GrpcMessageList — the `bru.grpc.req.messages` and `bru.grpc.res.messages` API in hooks, and the
 * only way a hook reads or writes gRPC messages.
 * Keep quickjs shim up to date on any updates to this class
 */
class GrpcMessageList {
  #readMessages;
  #writable;
  #toValue;
  #toEntry;

  /**
   * @param {Function} readMessages - Returns the backing array. A writable list needs it to return
   *   the same live array every call, since that array is what writes edit.
   * @param {object} [options]
   * @param {boolean} [options.writable=false] - When false, write methods throw
   * @param {Function} [options.toValue] - Maps a backing entry to the message a hook reads
   * @param {Function} [options.toEntry] - Maps `(message, existingEntry, index)` to a backing entry
   */
  constructor(readMessages, { writable = false, toValue = (entry) => entry, toEntry = (message) => message } = {}) {
    this.#readMessages = readMessages;
    this.#writable = writable;
    this.#toValue = toValue;
    this.#toEntry = toEntry;
  }

  #assertWritable(method) {
    if (!this.#writable) {
      throw new Error(
        `messages.${method}() is not available once the call has been sent — change the messages in the beforeCallStart hook`
      );
    }
  }

  #resolveIndex(index, messages) {
    if (!Number.isInteger(index) || index < 0 || index >= messages.length) {
      return undefined;
    }

    return index;
  }

  /** @returns {Array} */
  all() {
    return this.#readMessages().map(this.#toValue);
  }

  /**
   * The message at `index`. Unary and server-streaming calls have exactly one, hence the default.
   * @param {number} [index=0]
   * @returns {*}
   */
  get(index = 0) {
    return this.all()[index];
  }

  /** @returns {number} */
  count() {
    return this.all().length;
  }

  /** @param {Function} fn @param {*} [context] @returns {*} */
  find(fn, context) {
    return this.all().find(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [context] @returns {Array} */
  filter(fn, context) {
    return this.all().filter(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [context] @returns {Array} */
  map(fn, context) {
    return this.all().map(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [context] */
  each(fn, context) {
    this.all().forEach(context !== undefined ? fn.bind(context) : fn);
  }

  /** @param {Function} fn @param {*} [accumulator] @param {*} [context] @returns {*} */
  reduce(fn, ...args) {
    const bound = args.length > 1 ? fn.bind(args[1]) : fn;
    const messages = this.all();

    return args.length ? messages.reduce(bound, args[0]) : messages.reduce(bound);
  }

  /** @returns {Array} — same as `all()`, so `JSON.stringify` yields the messages */
  toJSON() {
    return this.all();
  }

  // ── Write methods (edit the backing array in place) ───────────────────
  /**
   * Replace the message at `index`, keeping whatever the entry there carries beyond the message
   * itself — the authored name, on the request.
   *
   * @param {number} index
   * @param {*} message
   */
  set(index, message) {
    this.#assertWritable('set');

    const messages = this.#readMessages();
    const target = this.#resolveIndex(index, messages);

    if (target === undefined) {
      return;
    }

    messages[target] = this.#toEntry(message, messages[target], target);
  }

  /**
   * Append a message.
   * @param {*} message
   */
  add(message) {
    this.#assertWritable('add');

    const messages = this.#readMessages();

    messages.push(this.#toEntry(message, undefined, messages.length));
  }

  /**
   * @param {*} message
   */
  prepend(message) {
    this.#assertWritable('prepend');

    const messages = this.#readMessages();

    messages.unshift(this.#toEntry(message, undefined, 0));
  }

  /**
   * Remove the message at `index`.
   * @param {number} index
   */
  delete(index) {
    this.#assertWritable('delete');

    const messages = this.#readMessages();
    const target = this.#resolveIndex(index, messages);

    if (target === undefined) {
      return;
    }

    messages.splice(target, 1);
  }

  /** Remove every message. */
  deleteAll() {
    this.#assertWritable('deleteAll');

    this.#readMessages().length = 0;
  }
}

module.exports = GrpcMessageList;
