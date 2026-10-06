const { cloneDeep } = require('lodash');

/** @typedef {import('./grpc-message')} GrpcMessage */

/*
 * GrpcMessageList — the `bru.grpc.request.messages` and `bru.grpc.response.messages` API in
 * hooks, and the only way a hook reads gRPC messages. Read-only: both lists report what the call
 * sent and received, so the class exposes no way to change either.
 * Keep quickjs shim up to date on any updates to this class
 */

/**
 * The messages of a gRPC call, in the order they were sent or received. Read-only.
 */
class GrpcMessageList {
  #messages;

  /**
   * @param {object[]} [messages] - The backing messages, deep-cloned once here so a hook editing
   *   a message cannot reach what the call actually sent or received. A list is built fresh for each
   *   hook run, so this snapshot is never stale.
   */
  constructor(messages) {
    this.#messages = cloneDeep(messages) ?? [];
  }

  /**
   * Get every message, in order.
   * @returns {GrpcMessage[]} A new array of the messages.
   * @category Read
   */
  all() {
    return [...this.#messages];
  }

  /**
   * Get the message at a position. Unary and client-to-server calls send exactly one, at `0`.
   * @param {number} [index] - The zero-based position; `0` when left out.
   * @returns {GrpcMessage | undefined} The message, or `undefined` past the end of the list.
   * @example
   * const reply = bru.grpc.response.messages.get().data;
   * @category Read
   */
  get(index = 0) {
    return this.all()[index];
  }

  /**
   * Count the messages.
   * @returns {number} How many messages the list has.
   * @category Read
   */
  count() {
    return this.all().length;
  }

  /**
   * Find the first message a predicate accepts.
   * @param {(message: GrpcMessage, index: number) => unknown} fn - Called with each message and its position.
   * @param {*} [context] - The `this` of `fn`.
   * @returns {GrpcMessage | undefined} The message, or `undefined` when none matches.
   * @category Search
   */
  find(fn, context) {
    return this.all().find(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Get every message a predicate accepts.
   * @param {(message: GrpcMessage, index: number) => unknown} fn - Called with each message and its position.
   * @param {*} [context] - The `this` of `fn`.
   * @returns {GrpcMessage[]} The matching messages, in order.
   * @category Search
   */
  filter(fn, context) {
    return this.all().filter(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Turn every message into a new value.
   * @param {(message: GrpcMessage, index: number) => any} fn - Called with each message and its position.
   * @param {*} [context] - The `this` of `fn`.
   * @returns {any[]} What `fn` returned for each message, in order.
   * @category Iteration
   */
  map(fn, context) {
    return this.all().map(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Call a function for every message, in order.
   * @param {(message: GrpcMessage, index: number) => void} fn - Called with each message and its position.
   * @param {*} [context] - The `this` of `fn`.
   * @category Iteration
   */
  each(fn, context) {
    this.all().forEach(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Combine the messages into a single value, like `Array.prototype.reduce`.
   * @type {(fn: (accumulator: any, message: GrpcMessage, index: number) => any, initialValue?: any, context?: any) => any}
   * @param fn - Called with the value so far, each message and its position.
   * @param initialValue - The starting value. Without it, the first message is.
   * @param context - The `this` of `fn`.
   * @returns The last value `fn` returned.
   * @category Iteration
   */
  reduce(fn, ...args) {
    const bound = args.length > 1 ? fn.bind(args[1]) : fn;
    const messages = this.all();

    return args.length ? messages.reduce(bound, args[0]) : messages.reduce(bound);
  }

  /**
   * Get the messages for `JSON.stringify()`; the same as `all()`.
   * @returns {GrpcMessage[]} A new array of the messages.
   * @category Transform
   */
  toJSON() {
    return this.all();
  }
}

module.exports = GrpcMessageList;
