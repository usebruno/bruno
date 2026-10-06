import { getMemberExpressionString } from '../ast-utils';

/**
 * Whether an identifier reference resolves to a given binding rather than to a different
 * declaration of the same name.
 *
 * @param {Object} path - Path of the reference
 * @param {Object} binding - { name, scopeNode, typeName }
 * @returns {boolean}
 */
export const resolvesToBinding = (path, binding) => {
  const scope = path.scope && path.scope.lookup(binding.name);
  return Boolean(scope) && scope.node === binding.scopeNode;
};

/**
 * Counts how many times each name is declared in each scope, so a name declared more than
 * once in the same scope can be left alone.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift Collection
 * @returns {Map<Object, Map<string, number>>} scope node -> name -> count
 */
const countDeclarationsPerScope = (j, ast) => {
  const counts = new Map();

  ast.find(j.VariableDeclarator).forEach((path) => {
    if (path.value.id.type !== 'Identifier') return;

    const scopeNode = path.scope.node;
    let byName = counts.get(scopeNode);
    if (!byName) {
      byName = new Map();
      counts.set(scopeNode, byName);
    }

    const name = path.value.id.name;
    byName.set(name, (byName.get(name) || 0) + 1);
  });

  return counts;
};

/**
 * Whether the binding is written to after its declaration, which makes what it holds
 * unknowable from the declaration alone.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift Collection
 * @param {Object} binding - { name, scopeNode, typeName }
 * @returns {boolean}
 */
const isReassigned = (j, ast, binding) => {
  const isTarget = (path, node) =>
    node.type === 'Identifier' && node.name === binding.name && resolvesToBinding(path, binding);

  const assigned = ast
    .find(j.AssignmentExpression)
    .paths()
    .some((path) => isTarget(path, path.value.left));

  if (assigned) return true;

  return ast
    .find(j.UpdateExpression)
    .paths()
    .some((path) => isTarget(path, path.value.argument));
};

/**
 * The type a declaration's initialiser yields, or null when it isn't one the registry knows.
 *
 * @param {Object} init - The initialiser node
 * @param {Object} registry - The API registry
 * @returns {string|null} Type name
 */
const inferInitialiserType = (init, registry) => {
  // Bruno runs scripts in an async closure, so a produced value commonly arrives awaited
  const produced = init.type === 'AwaitExpression' ? init.argument : init;

  if (produced.type !== 'CallExpression') return null;

  return registry.producers[getMemberExpressionString(produced.callee)] || null;
};

/**
 * Finds every variable binding whose value the registry can type.
 *
 * A binding is tracked only when what it holds is certain: an uncertain one is dropped
 * rather than guessed, since a missed translation is visible in the output while a wrong
 * one silently changes what the script does.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift Collection
 * @param {Object} registry - The API registry
 * @returns {Array<{name: string, scopeNode: Object, typeName: string}>}
 */
export const collectBindings = (j, ast, registry) => {
  const bindings = [];
  const declarationCounts = countDeclarationsPerScope(j, ast);

  ast.find(j.VariableDeclarator).forEach((path) => {
    if (path.value.id.type !== 'Identifier' || !path.value.init) return;

    const typeName = inferInitialiserType(path.value.init, registry);
    if (!typeName) return;

    const name = path.value.id.name;
    const scopeNode = path.scope.node;

    /**
     * ast-types models function scope, not block scope, so a `const` inside a nested block
     * resolves to the enclosing function's scope and is indistinguishable from one declared
     * beside it:
     *
     *   const r = await pm.sendRequest(req);
     *   if (retry) { const r = cached; console.log(r.code); }  // also resolves to Program
     *
     * Two declarations of the name in one scope means references can't be attributed to
     * either, so neither is tracked.
     */
    if (declarationCounts.get(scopeNode).get(name) > 1) return;

    const binding = { name, scopeNode, typeName };
    if (isReassigned(j, ast, binding)) return;

    bindings.push(binding);
  });

  return bindings;
};
