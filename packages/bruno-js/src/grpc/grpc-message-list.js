const { cloneDeep } = require('lodash');

/** @typedef {import('./grpc-message')} GrpcMessage */

/*
 * GrpcMessageList — the `bru.grpc.request.messages` and `bru.grpc.response.messages` API in
 * hooks, and the only way a hook reads gRPC messages. Read-only: both lists report what the call
 * sent and received, so the class exposes no way to change either.
 * Keep quickjs shim up to date on any updates to this class
 */

/**
 * The messages of a gRPC call so far, in order. The list can't be changed.
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
   * Get the message at a position.
   *
   * Without `index`, the first message: the only one when that side of the call does not stream.
   * @param {number} [index] - The zero-based position.
   * @returns {GrpcMessage | undefined} The message, or `undefined` when there are fewer messages.
   * @example
   * const reply = bru.grpc.response.messages.get().data;
   * @category Read
   */
  get(index = 0) {
    return this.all()[index];
  }

  /**
   * Get the number of messages.
   * @returns {number} The number of messages.
   * @category Read
   */
  count() {
    return this.all().length;
  }

  /**
   * Get the first message `fn` accepts.
   * @param {(message: GrpcMessage, index: number) => boolean} fn - Called with each message and its
   *   position.
   * @param {any} [context] - The `this` of `fn`.
   * @returns {GrpcMessage | undefined} The message, or `undefined` when none matches.
   * @category Search
   */
  find(fn, context) {
    return this.all().find(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Get every message `fn` accepts.
   * @param {(message: GrpcMessage, index: number) => boolean} fn - Called with each message and its
   *   position.
   * @param {any} [context] - The `this` of `fn`.
   * @returns {GrpcMessage[]} The matching messages, in order.
   * @category Search
   */
  filter(fn, context) {
    return this.all().filter(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Build an array from the result of `fn` for each message.
   * @param {(message: GrpcMessage, index: number) => any} fn - Called with each message and its
   *   position.
   * @param {any} [context] - The `this` of `fn`.
   * @returns {any[]} The results, in the order of the messages.
   * @example
   * const replies = bru.grpc.response.messages.map((message) => message.data);
   * @category Iteration
   */
  map(fn, context) {
    return this.all().map(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Call `fn` once for each message, in order.
   * @param {(message: GrpcMessage, index: number) => void} fn - Called with each message and its
   *   position.
   * @param {any} [context] - The `this` of `fn`.
   * @category Iteration
   */
  each(fn, context) {
    this.all().forEach(context !== undefined ? fn.bind(context) : fn);
  }

  /**
   * Combine the messages into a single value, as `Array.prototype.reduce` does.
   *
   * Without `initialValue`, the first message is the starting value, and an empty list throws.
   * @type {(fn: (accumulator: any, message: GrpcMessage, index: number) => any, initialValue?: any, context?: any) => any}
   * @param fn - Called with the value so far, each message and its position; returns the next value.
   * @param initialValue - The starting value.
   * @param context - The `this` of `fn`.
   * @category Iteration
   */
  reduce(fn, ...args) {
    const bound = args.length > 1 ? fn.bind(args[1]) : fn;
    const messages = this.all();

    return args.length ? messages.reduce(bound, args[0]) : messages.reduce(bound);
  }

  /**
   * Get the messages for `JSON.stringify`, the same as `all()`.
   * @returns {GrpcMessage[]} A new array of the messages.
   * @category Transform
   */
  toJSON() {
    return this.all();
  }
}

module.exports = GrpcMessageList;
