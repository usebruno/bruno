import { getStaticPropertyName, isFunctionExpression } from '../ast-utils';
import { getExpressionType, isReassigned, resolvesToBinding } from './type-environment';
import { rewritePattern } from './rewrite-patterns';

/**
 * How a typed value travels through a promise chain.
 *
 * Nothing here is a fact about either API — it is promise semantics, which is why the same
 * module serves both directions and every producer that hands back a promise. What each
 * handler slot *receives* is declared in `correspondence.js`; which handlers still hold it
 * is decided here, from the script.
 */

export const PROMISE_CHAIN_METHODS = new Set(['then', 'catch', 'finally']);

/**
 * Whether an argument node is an explicit absent value, as in `.then(null, onError)`.
 *
 * @param {Object} node - Argument node
 * @returns {boolean}
 */
const isNullish = (node) =>
  (node.type === 'Literal' && node.value === null)
  || (node.type === 'Identifier' && node.name === 'undefined');

/**
 * Collects the `.then`/`.catch`/`.finally` calls chained off the given call, innermost first.
 *
 * @param {Object} callPath - Path of the CallExpression the chain hangs off
 * @returns {Array<{callPath: Object, methodName: string}>}
 */
export const getPromiseChainLinks = (callPath) => {
  const links = [];
  let currentPath = callPath;

  while (true) {
    const memberPath = currentPath.parent;
    if (!memberPath || memberPath.value.type !== 'MemberExpression') break;
    if (memberPath.value.object !== currentPath.value) break;

    const methodName = getStaticPropertyName(memberPath.value);
    if (!PROMISE_CHAIN_METHODS.has(methodName)) break;

    const chainedCallPath = memberPath.parent;
    if (!chainedCallPath || chainedCallPath.value.type !== 'CallExpression') break;
    if (chainedCallPath.value.callee !== memberPath.value) break;

    links.push({ callPath: chainedCallPath, methodName });
    currentPath = chainedCallPath;
  }

  return links;
};

/**
 * The return statements belonging to the handler itself.
 *
 * @example
 * sendRequest(req).then((res) => {
 *   const extract = () => {
 *     return res.data;      // nested function's return — not the handler's
 *   };
 *   console.log(extract());
 *   return res;             // the handler's actual return
 * });
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} handlerPath - Path of the handler argument
 * @returns {Object[]} Paths of the handler's own return statements
 */
const findOwnReturns = (j, handlerPath) =>
  j(handlerPath)
    .find(j.ReturnStatement)
    .paths()
    .filter((returnPath) => j(returnPath).closest(j.Function).get().value === handlerPath.value);

/**
 * Whether the handler forwards its parameter untouched, so the next link in the chain still
 * receives the value this one was typed with.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} handlerPath - Path of the `.then` fulfilled handler argument
 * @returns {boolean}
 */
const returnsParamUnchanged = (j, handlerPath) => {
  const handler = handlerPath.value;
  const paramName = handler.params[0].name;
  const body = handler.body;

  // a concise arrow body is the returned expression itself, so it only forwards the
  // value when that expression is the parameter — `res => res` yes, `res => res.data` no
  if (body.type !== 'BlockStatement') {
    return body.type === 'Identifier' && body.name === paramName;
  }

  // Every path must end in a return: a body that can fall through forwards an implicit undefined,
  // and a handler with no returns at all would pass the `every` check below vacuously.
  const lastStatement = body.body[body.body.length - 1];
  if (!lastStatement || lastStatement.type !== 'ReturnStatement') return false;

  return findOwnReturns(j, handlerPath).every((returnPath) => {
    const argument = returnPath.value.argument;
    const returnsParamIdentifier
      = Boolean(argument) && argument.type === 'Identifier' && argument.name === paramName;

    return returnsParamIdentifier && resolvesToBinding(returnPath, { name: paramName, scopeNode: handler });
  });
};

/**
 * The bindings a handler's parameters establish, from the types its slots are declared to
 * receive.
 *
 * A destructured parameter establishes no binding — it unpacks to plain values rather than to
 * the typed value itself — so it is rewritten in place here, the same way
 * `rewriteDestructuredDeclarations` handles a destructured declaration.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} handlerPath - Path of the handler function
 * @param {Array<string|null>} slotTypes - Registry type per parameter position, null where the
 *   position receives nothing
 * @param {Object} registry - The API registry
 * @returns {Array<{name: string, scopeNode: Object, typeName: string}>}
 */
export const collectHandlerBindings = (j, handlerPath, slotTypes, registry) => {
  const handler = handlerPath.value;
  const bindings = [];

  slotTypes.forEach((typeName, index) => {
    const param = typeName && handler.params[index];
    if (!param) return;

    if (param.type === 'ObjectPattern') {
      rewritePattern(j, param, typeName, registry);
      return;
    }

    if (param.type !== 'Identifier') return;

    bindings.push({ name: param.name, scopeNode: handler, typeName });
  });

  return bindings;
};

/**
 * The bindings a promise chain establishes, walking outwards until the typed value provably
 * stops travelling.
 *
 * A link is typed before the forwarding checks run, so a handler that reads the value and then
 * returns something else still gets its own body translated — it just does not license
 * continuing past itself.
 *
 * @param {Object} j - jscodeshift API
 * @param {Array<{callPath: Object, methodName: string}>} chainLinks - Links from `getPromiseChainLinks`
 * @param {string} typeName - Registry type the chain's head yields, which is what a fulfilled
 *   handler's first parameter receives
 * @param {Object} registry - The API registry
 * @returns {Array<{name: string, scopeNode: Object, typeName: string}>}
 */
export const collectChainBindings = (j, chainLinks, typeName, registry) => {
  const bindings = [];

  for (const link of chainLinks) {
    // a `.catch` handler substitutes its own return value for the rest of the chain, so links
    // past it no longer receive the value we typed
    if (link.methodName === 'catch') break;

    const [handler] = link.callPath.value.arguments;

    // `.finally`, `.then()` and `.then(null, onError)` replace nothing, so the next link still
    // receives the value
    const hasFulfilledHandler = link.methodName === 'then' && Boolean(handler) && !isNullish(handler);
    if (!hasFulfilledHandler) continue;

    // a handler passed by reference has no body to analyse
    if (!isFunctionExpression(handler)) break;
    if (handler.params.length === 0) break;

    const handlerPath = link.callPath.get('arguments', 0);
    bindings.push(...collectHandlerBindings(j, handlerPath, [typeName], registry));

    const param = handler.params[0];
    if (param.type !== 'Identifier') break;

    if (!returnsParamUnchanged(j, handlerPath)) break;
    if (isReassigned(j, j(handlerPath), { name: param.name, scopeNode: handler })) break;
  }

  return bindings;
};

/**
 * Every promise chain in the script whose head the registry can type.
 *
 * Driving this from the type of the head expression rather than from a known call is what keeps
 * it general: nothing here names `sendRequest`, so any producer or member that comes to yield a
 * type is chainable without a change. An inner link is never a head of its own — no type declares
 * a `then` member — so each chain is walked once.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift Collection
 * @param {Array} bindings - Bindings collected from variable declarations
 * @param {Object} registry - The API registry
 * @returns {Array<{name: string, scopeNode: Object, typeName: string}>}
 */
export const collectAllChainBindings = (j, ast, bindings, registry) => {
  const chainBindings = [];

  ast.find(j.CallExpression).paths().forEach((callPath) => {
    const typeName = getExpressionType(callPath, bindings, registry);
    if (!typeName) return;

    const chainLinks = getPromiseChainLinks(callPath);
    if (!chainLinks.length) return;

    chainBindings.push(...collectChainBindings(j, chainLinks, typeName, registry));
  });

  return chainBindings;
};
