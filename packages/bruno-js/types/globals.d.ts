/// <reference types="chai" />

/*
 * The globals a script can use, and the contexts it can use them in. The script API is everything
 * reachable from these; scripts/generate-script-api.js walks them to build the API reference and
 * the editor manifest. Each global's `@context` must match what the runtimes in src/runtime and
 * src/grpc actually put in scope.
 */

import Bru = require('../src/bru');
import BrunoRequest = require('../src/bruno-request');
import BrunoResponse = require('../src/bruno-response');
import BrunoGrpcRequest = require('../src/grpc/bruno-grpc-request');
import BrunoGrpcResponse = require('../src/grpc/bruno-grpc-response');

/**
 * The request about to be sent (pre-request), or the one that was sent (post-response and tests).
 *
 * Read and change the URL, method, headers, body and settings. Changes only take effect in a
 * pre-request script, before the request goes out. Variables are interpolated after the
 * pre-request script runs, so there its values still contain their `{{variables}}`.
 */
export interface Request extends BrunoRequest {}

/**
 * The response to the request.
 *
 * `res` is also a function: `res('data.items[0].id')` queries the response body with a path
 * expression, the same as `res.body.data.items[0].id` but `undefined` instead of an error when a
 * step is missing.
 */
export interface Response extends BrunoResponse {
  /**
   * Query the response body with a path expression.
   *
   * @param path - Dot path into the body. `..` searches at any depth, `[0]` indexes an array and
   *   `[?]` filters or maps an array with the next function or object in `filters`.
   * @param filters - One predicate, mapper or `{ key: value }` match object per `[?]` in the path.
   * @returns The value at the path, or `undefined` when there is none.
   * @example
   * const id = res('data.items[0].id');
   * const ids = res('..items[?].id', (item) => item.active);
   */
  (path: string, ...filters: Array<object | ((item: any) => any)>): any;
}

/** The request of the gRPC call, as `bru.grpc.request`. */
export interface GrpcRequest extends BrunoGrpcRequest {}

/** What the gRPC server has answered so far, as `bru.grpc.response`. */
export interface GrpcResponse extends BrunoGrpcResponse {}

/** The gRPC call a hook runs in. */
export interface Grpc {
  /**
   * The call's request: target, method, metadata and the messages sent.
   * @category gRPC
   */
  readonly request: GrpcRequest;
  /**
   * What the server has answered so far: status, metadata, trailers and messages.
   *
   * In `afterMessageReceive` the call is still open, so the status, duration and trailers are not
   * known yet.
   * @context grpc:after-message-receive grpc:after-call-end
   * @category gRPC
   */
  readonly response?: GrpcResponse;
}

/**
 * Bruno's scripting API: variables, environments, cookies, the collection runner, and sending
 * requests from a script.
 *
 * @context pre-request post-response tests grpc:before-call-start grpc:before-message-send grpc:after-message-receive grpc:after-call-end
 */
export declare const bru: Bru;

/**
 * The HTTP request.
 *
 * @context pre-request post-response tests
 */
export declare const req: Request;

/**
 * The HTTP response.
 *
 * @context post-response tests
 */
export declare const res: Response;

/**
 * Define a test. Its result shows in the Tests tab of the response pane.
 *
 * A test passes when `fn` returns, or resolves, without throwing; any error or failed assertion
 * fails it. Tests run in the order they are declared, and the script waits for async tests to
 * settle before it finishes.
 *
 * @param name - The test's name, as shown in the results.
 * @param fn - The test body. Make it `async` to await inside it.
 * @returns A promise that settles once the test has run. It never rejects.
 * @example
 * test('responds with 200', () => {
 *   expect(res.getStatus()).to.equal(200);
 * });
 * @context pre-request post-response tests grpc:before-call-start grpc:before-message-send grpc:after-message-receive grpc:after-call-end
 */
export declare function test(name: string, fn: () => void | Promise<void>): Promise<void>;

/**
 * Chai's BDD assertion style: `expect(value).to.equal(expected)`.
 *
 * See https://www.chaijs.com/api/bdd/ for every assertion.
 *
 * @example
 * expect(res.getStatus()).to.equal(200);
 * expect(res.body).to.have.property('id');
 * @context pre-request post-response tests grpc:before-call-start grpc:before-message-send grpc:after-message-receive grpc:after-call-end
 */
export declare const expect: Chai.ExpectStatic;

/**
 * Chai's assert style: `assert.equal(actual, expected)`.
 *
 * See https://www.chaijs.com/api/assert/ for every assertion.
 *
 * @example
 * assert.equal(res.getStatus(), 200);
 * @context pre-request post-response tests grpc:before-call-start grpc:before-message-send grpc:after-message-receive grpc:after-call-end
 */
export declare const assert: Chai.AssertStatic;
