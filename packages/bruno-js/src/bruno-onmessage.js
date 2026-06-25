const { get } = require('@usebruno/query');

/**
 * Wraps a single incoming gRPC message for the "on message" script hook.
 * The hook fires once per server message, so this exposes that one message as
 * `stream.message` (mirrors Postman's `pm.message`).
 *
 * The instance is also callable — `stream('path.to.value')` queries into the
 * message, same ergonomics as `res(...)` for responses.
 */
class BrunoOnMessage {
  constructor(message) {
    this.message = message ?? null;

    // Make the instance callable: stream('a.b.c') reads into the message.
    const callable = (...args) => get(this.message, ...args);
    Object.setPrototypeOf(callable, this.constructor.prototype);
    Object.assign(callable, this);

    return callable;
  }

  getMessage() {
    return this.message;
  }
}

module.exports = BrunoOnMessage;
