/**
 * Post-pass for pm.sendRequest(...) promise chains.
 *
 * The generic sendRequestTransformer replaces only the inner pm.sendRequest
 * CallExpression and leaves a chained call unawaited (see
 * getChainedPromiseMemberPath, which it shares). This pass runs once
 * processTransformations has settled the AST and finishes those chains:
 *
 *   1. injects a response shim as the first `.then` link so downstream
 *      handlers see a Postman-shaped response (`.json()`, `.code`, `.status`,
 *      `.text()`) even though Bruno resolves an axios-shaped one. User code in
 *      later handlers is left untouched — no rewriting, no scope analysis.
 *   2. awaits the outermost chain link, when the position allows it.
 *
 * The transformer emits its callee as a single dotted Identifier named
 * `bru.sendRequest` — a shape no parser produces from source — so matching on
 * it targets exactly the calls the transformer created, never user code.
 */

const PROMISE_CHAIN_METHODS = new Set(['then', 'catch', 'finally']);

// Postman-shape response shim: spreads Bruno's axios-shaped response and adds
// the Postman method/property aliases on top. Property order matters — the
// aliases are declared after the spread so they override same-named fields
// (e.g. `status` on the wrapped object becomes Postman's status *text*, while
// the underlying `res.status` remains the numeric HTTP code exposed as `code`).
const RESPONSE_SHIM_SRC = '(res) => ({ ...res, json: () => res.data, text: () => res.data, code: res.status, status: res.statusText })';

/**
 * Get the statically-known property name of a member expression. A computed
 * access with a non-literal key (`p[someVar]`) has no static name — even an
 * Identifier key named `then` is a variable there, not the method.
 * @param {Object} memberExpr - MemberExpression node
 * @returns {string|null}
 */
const getStaticPropertyName = (memberExpr) => {
  const property = memberExpr.property;
  if (memberExpr.computed) {
    return property.type === 'Literal' && typeof property.value === 'string' ? property.value : null;
  }
  return property.type === 'Identifier' ? property.name : null;
};

/**
 * Get the `.then`/`.catch`/`.finally` member expression a node is chained into
 * @param {Object} path - Path of the node the chain would hang off
 * @returns {Object|null} - Path of the chaining MemberExpression, or null
 */
export const getChainedPromiseMemberPath = (path) => {
  const parent = path.parent;
  if (!parent || parent.value.type !== 'MemberExpression') return null;
  if (parent.value.object !== path.value) return null;

  return PROMISE_CHAIN_METHODS.has(getStaticPropertyName(parent.value)) ? parent : null;
};

/**
 * Whether `await` may be emitted at this position. Bruno evaluates scripts in an
 * async context, so top level is awaitable; a non-async enclosing function is
 * not — emitting `await` there is a syntax error that breaks the whole script.
 * @param {Object} j - jscodeshift API
 * @param {Object} path - Path to test
 * @returns {boolean}
 */
const isInAsyncContext = (j, path) => {
  const enclosingFunction = j(path).closest(j.Function);
  return !enclosingFunction.size() || enclosingFunction.get().value.async === true;
};

/**
 * Collect the `.then`/`.catch`/`.finally` calls chained off the given call,
 * innermost first.
 * @param {Object} callPath - Path of the CallExpression the chain hangs off
 * @returns {Array<{callPath: Object, methodName: string}>}
 */
const getPromiseChainLinks = (callPath) => {
  const links = [];
  let currentPath = callPath;

  for (let memberPath = getChainedPromiseMemberPath(currentPath); memberPath; memberPath = getChainedPromiseMemberPath(currentPath)) {
    const chainedCallPath = memberPath.parent;
    if (!chainedCallPath || chainedCallPath.value.type !== 'CallExpression') break;

    links.push({ callPath: chainedCallPath, methodName: getStaticPropertyName(memberPath.value) });
    currentPath = chainedCallPath;
  }

  return links;
};

/**
 * Build a fresh AST node for the Postman-shape response shim arrow function.
 * Parsed from source on each call so the returned node has no shared identity
 * with any other point in the AST.
 * @param {Object} j - jscodeshift API
 * @returns {Object} - ArrowFunctionExpression node
 */
const buildResponseShim = (j) => j(RESPONSE_SHIM_SRC).find(j.ArrowFunctionExpression).nodes()[0];

/**
 * Insert `.then(responseShim)` immediately after `bru.sendRequest(...)`, before
 * any user-authored chain link. Downstream `.then` handlers now receive a
 * Postman-shaped response and `res.json()`/`res.code`/etc. work unchanged.
 * @param {Object} j - jscodeshift API
 * @param {Object} sendRequestCallPath - Path of the bru.sendRequest(...) CallExpression
 */
const injectResponseShim = (j, sendRequestCallPath) => {
  const shimCall = j.callExpression(
    j.memberExpression(sendRequestCallPath.value, j.identifier('then')),
    [buildResponseShim(j)]
  );
  j(sendRequestCallPath).replaceWith(shimCall);
};

/**
 * Finish bru.sendRequest promise chains the main transformation pass left
 * unawaited: shim the response into Postman shape, and await the outermost
 * chain link where valid.
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift AST collection
 */
const wrapAndAwaitSendRequestChains = (j, ast) => {
  ast.find(j.CallExpression, {
    callee: {
      type: 'Identifier',
      name: 'bru.sendRequest'
    }
  }).forEach((callPath) => {
    const links = getPromiseChainLinks(callPath);
    if (!links.length) return;

    // Only .then handlers receive the response; .catch/.finally-only chains
    // never call the response API and don't need the shim.
    const hasThenLink = links.some((link) => link.methodName === 'then');
    if (hasThenLink) injectResponseShim(j, callPath);

    // The outermost link paths were captured before the shim was inserted; the
    // shim is inserted underneath them, so their positions in the AST are
    // unchanged and outermostPath still identifies the tail of the chain.
    const outermostPath = links[links.length - 1].callPath;

    if (outermostPath.parent.value.type === 'AwaitExpression') return;
    if (!isInAsyncContext(j, outermostPath)) return;

    j(outermostPath).replaceWith(j.awaitExpression(outermostPath.value));
  });
};

export default wrapAndAwaitSendRequestChains;
