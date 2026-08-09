/**
 * Post-pass for pm.sendRequest(...) promise chains.
 *
 * The generic sendRequestTransformer replaces only the inner pm.sendRequest
 * CallExpression and always awaits it, so a chained call comes out of the main
 * transformation pass as `(await bru.sendRequest(cfg)).then(...)` — the await
 * resolves the response and `.then` is called on a non-thenable. This pass runs
 * after processTransformations and repairs those chains on the settled AST:
 *
 *   1. unwraps the misplaced inner await
 *   2. rewrites Postman response access in the first `.then` fulfilled handler
 *      (res.json() -> res.data, res.code -> res.status, ...)
 *   3. awaits the outermost chain link instead, when the position allows it
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
 * Get the `.then`/`.catch`/`.finally` member expression a node is chained into
 * @param {Object} path - Path of the node the chain would hang off
 * @returns {Object|null} - Path of the chaining MemberExpression, or null
 */
const getChainedPromiseMemberPath = (path) => {
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
 * Rewrite Postman response access inside the first `.then` fulfilled handler of
 * the chain. Only the first `.then` receives the response — later handlers
 * receive whatever their predecessor returned, and `.catch`/`.finally` handlers
 * receive an error or nothing.
 * @param {Object} j - jscodeshift API
 * @param {Object} callPath - Path of the CallExpression the chain hangs off
 */
const rewriteFirstThenHandler = (j, callPath) => {
  let currentPath = callPath;

  for (let memberPath = getChainedPromiseMemberPath(currentPath); memberPath; memberPath = getChainedPromiseMemberPath(currentPath)) {
    const chainedCallPath = memberPath.parent;
    if (!chainedCallPath || chainedCallPath.value.type !== 'CallExpression') return;

    if (getStaticPropertyName(memberPath.value) === 'then') {
      // the response is consumed here, whether or not the handler is rewritable
      const handlerPath = chainedCallPath.get('arguments', 0);
      rewriteResponsePropertyAccess(j, handlerPath);
      return;
    }

    currentPath = chainedCallPath;
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
 * Repair bru.sendRequest promise chains left behind by the main transformation
 * pass: unwrap the misplaced inner await, rewrite the response access in the
 * first `.then` handler, and await the outermost chain link where valid.
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift AST collection
 */
const transformSendRequestChains = (j, ast) => {
  ast.find(j.AwaitExpression).forEach((awaitPath) => {
    const call = awaitPath.value.argument;
    if (!call || call.type !== 'CallExpression') return;
    if (call.callee.type !== 'Identifier' || call.callee.name !== 'bru.sendRequest') return;

    // only awaits that sit inside a promise chain are misplaced
    if (!getChainedPromiseMemberPath(awaitPath)) return;

    // unwrap: (await bru.sendRequest(cfg)).then(...) -> bru.sendRequest(cfg).then(...)
    const callPath = j(awaitPath).replaceWith(call).paths()[0];

    rewriteFirstThenHandler(j, callPath);

    // walk to the outermost call of the .then/.catch/.finally chain
    let outermostPath = callPath;
    for (let memberPath = getChainedPromiseMemberPath(outermostPath); memberPath; memberPath = getChainedPromiseMemberPath(outermostPath)) {
      const chainedCallPath = memberPath.parent;
      if (!chainedCallPath || chainedCallPath.value.type !== 'CallExpression') break;
      outermostPath = chainedCallPath;
    }

    if (outermostPath.parent.value.type === 'AwaitExpression') return;
    if (!isInAsyncContext(j, outermostPath)) return;

    j(outermostPath).replaceWith(j.awaitExpression(outermostPath.value));
  });
};

export default transformSendRequestChains;
