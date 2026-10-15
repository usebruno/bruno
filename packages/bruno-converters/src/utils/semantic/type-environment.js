import { getMemberExpressionString, getStaticPropertyName } from '../ast-utils';

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
 * The registry type an expression evaluates to, or null when the registry cannot say.
 *
 * Resolving an *expression* rather than only a name is what lets a type reach past its own
 * members at any depth: `jar.getAll(u)` is typed from `jar`'s type plus the row `getAll`
 * declares, whether or not it was ever given a name.
 *
 * @param {Object} path - Path of the expression
 * @param {Array} bindings - Bindings collected so far
 * @param {Object} registry - The API registry
 * @returns {string|null} Type name
 */
export const getExpressionType = (path, bindings, registry) => {
  const node = path.value;

  // Bruno runs scripts in an async closure, so a produced value commonly arrives awaited
  if (node.type === 'AwaitExpression') {
    return getExpressionType(path.get('argument'), bindings, registry);
  }

  if (node.type === 'Identifier') {
    const binding = bindings.find(
      (known) => known.name === node.name && resolvesToBinding(path, known)
    );

    return binding ? binding.typeName : null;
  }

  if (node.type !== 'CallExpression') return null;

  const produced = registry.producers[getMemberExpressionString(node.callee)];
  if (produced) return produced;

  if (node.callee.type !== 'MemberExpression') return null;

  const calleePath = path.get('callee');
  const receiverType = getExpressionType(calleePath.get('object'), bindings, registry);
  if (!receiverType) return null;

  const members = registry.types[receiverType];
  const member = getStaticPropertyName(calleePath.value);
  const spec = member && members && members[member];

  return (spec && spec.yields && spec.yields.type) || null;
};

/**
 * Finds every variable binding whose value the registry can type. An uncertain binding is dropped rather than guessed
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift Collection
 * @param {Object} registry - The API registry
 * @returns {Array<{name: string, scopeNode: Object, typeName: string}>}
 */
export const collectBindings = (j, ast, registry) => {
  const bindings = [];
  const declarationCounts = countDeclarationsPerScope(j, ast);

  const candidates = ast
    .find(j.VariableDeclarator)
    .paths()
    .filter((path) => path.value.id.type === 'Identifier' && path.value.init);

  /**
   * A binding can be typed from one typed in an earlier round, so the sweep repeats until a
   * round adds nothing. Only pushing a binding sets `grew`, which is what ends it.
   */
  let grew = true;

  while (grew) {
    grew = false;

    candidates.forEach((path) => {
      const name = path.value.id.name;
      const scopeNode = path.scope.node;

      if (bindings.some((known) => known.name === name && known.scopeNode === scopeNode)) return;

      const typeName = getExpressionType(path.get('init'), bindings, registry);
      if (!typeName) return;

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
      grew = true;
    });
  }

  return bindings;
};
