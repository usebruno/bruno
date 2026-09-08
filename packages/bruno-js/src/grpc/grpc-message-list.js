/**
 * GrpcMessageList — the `bru.grpc.request.messages` and `bru.grpc.response.messages` API in
 * hooks, and the only way a hook reads gRPC messages. Read-only: both lists report what the call
 * sent and received, so the class exposes no way to change either.
 * Keep quickjs shim up to date on any updates to this class
 */
class GrpcMessageList {
  #readMessages;

  /**
   * @param {Function} readMessages - Returns the backing array, read again on every access
   */
  constructor(readMessages) {
    this.#readMessages = readMessages;
  }

  /** @returns {Array} */
  all() {
    return [...this.#readMessages()];
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
}

module.exports = GrpcMessageList;
