/**
 * Post-pass for pm.sendRequest(...) promise chains.
 *
 * The generic sendRequestTransformer replaces only the inner pm.sendRequest
 * CallExpression and leaves a chained call unawaited (see
 * getChainedPromiseMemberPath, which it shares). This pass runs after
 * processTransformations and finishes those chains on the settled AST:
 *
 *   1. rewrites Postman response access in the first `.then` fulfilled handler
 *      (res.json() -> res.data, res.code -> res.status, ...)
 *   2. awaits the outermost chain link, when the position allows it
 *
 * The transformer emits its callee as a single dotted Identifier named
 * `bru.sendRequest` — a shape no parser produces from source — so matching on
 * it targets exactly the calls the transformer created, never user code.
 */

const PROMISE_CHAIN_METHODS = new Set(['then', 'catch', 'finally']);

// Postman's response API vs Bruno's axios-shaped response. json()/text() are
// methods on the Postman response but already-parsed properties on Bruno's.
const responsePropertyMap = {
  json: 'data',
  text: 'data',
  code: 'status',
  status: 'statusText'
};

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
 * Whether a `.then` first argument lets the response pass through untouched.
 * Per the promise spec, a non-callable onFulfilled is replaced by the identity
 * function — so no argument, `null`, or `undefined` hands the response to the
 * next link in the chain.
 * @param {Object|undefined} arg - The `.then` call's first argument node
 * @returns {boolean}
 */
const isPassThroughHandler = (arg) => {
  if (!arg) return true;
  if (arg.type === 'Literal' && arg.value === null) return true;
  return arg.type === 'Identifier' && arg.name === 'undefined';
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
 * Rewrite Postman response access inside the first `.then` fulfilled handler of
 * the chain. Only the first `.then` receives the response — later handlers
 * receive whatever their predecessor returned, and `.catch`/`.finally` handlers
 * receive an error or nothing.
 * @param {Object} j - jscodeshift API
 * @param {Array<{callPath: Object, methodName: string}>} links - Chain links, innermost first
 */
const rewriteResponseConsumingThenHandler = (j, links) => {
  for (const link of links) {
    // a non-callable onFulfilled forwards the response to the next link
    if (link.methodName === 'then' && !isPassThroughHandler(link.callPath.value.arguments[0])) {
      // the response is consumed here, whether or not the handler is rewritable
      rewriteResponsePropertyAccess(j, link.callPath.get('arguments', 0));
      return;
    }
  }
};

/**
 * Rewrite Postman response property/method access on the handler's response
 * parameter to its Bruno equivalent. References that resolve to a different
 * binding (a nested function re-declaring the name) are left alone.
 * @param {Object} j - jscodeshift API
 * @param {Object} handlerPath - Path of the `.then` fulfilled handler argument
 */
const rewriteResponsePropertyAccess = (j, handlerPath) => {
  const handler = handlerPath.value;
  if (!handler) return;
  if (handler.type !== 'FunctionExpression' && handler.type !== 'ArrowFunctionExpression') return;
  if (handler.params[0]?.type !== 'Identifier') return;

  const responseVarName = handler.params[0].name;

  j(handlerPath).find(j.MemberExpression, {
    object: {
      type: 'Identifier',
      name: responseVarName
    }
  }).forEach((memberPath) => {
    const property = memberPath.value.property;
    if (property.type !== 'Identifier') return;

    const bruProperty = responsePropertyMap[property.name];
    if (!bruProperty) return;

    // skip references shadowed by a nested re-declaration of the name
    const declaringScope = memberPath.scope.lookup(responseVarName);
    if (!declaringScope || declaringScope.node !== handler) return;

    const replacement = j.memberExpression(j.identifier(responseVarName), j.identifier(bruProperty));

    // response.json() collapses to response.data — the call goes away with it.
    // Only when the member is the callee: in console.log(response.code) the
    // parent is also a CallExpression, and replacing it would eat the log.
    const parentPath = memberPath.parent;
    if (parentPath.value.type === 'CallExpression' && parentPath.value.callee === memberPath.value) {
      j(parentPath).replaceWith(replacement);
    } else {
      j(memberPath).replaceWith(replacement);
    }
  });
};

/**
 * Finish bru.sendRequest promise chains the main transformation pass left
 * unawaited: rewrite the response access in the first `.then` handler, and
 * await the outermost chain link where valid.
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift AST collection
 */
const transformSendRequestChains = (j, ast) => {
  ast.find(j.CallExpression, {
    callee: {
      type: 'Identifier',
      name: 'bru.sendRequest'
    }
  }).forEach((callPath) => {
    const links = getPromiseChainLinks(callPath);
    if (!links.length) return;

    rewriteResponseConsumingThenHandler(j, links);

    // the outermost call of the .then/.catch/.finally chain is the last link
    const outermostPath = links[links.length - 1].callPath;

    if (outermostPath.parent.value.type === 'AwaitExpression') return;
    if (!isInAsyncContext(j, outermostPath)) return;

    j(outermostPath).replaceWith(j.awaitExpression(outermostPath.value));
  });
};

export default transformSendRequestChains;
