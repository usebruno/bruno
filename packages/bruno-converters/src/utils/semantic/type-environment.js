import { getMemberExpressionString, getStaticPropertyName } from '../ast-utils';

const BLOCK_SCOPED_KINDS = new Set(['const', 'let']);

/**
 * Whether a node encloses a path, walking the path upwards. Used instead of a scope lookup where
 * block scope matters: the AST library models function scope, so two `const`s of one name in
 * sibling blocks are indistinguishable to it.
 *
 * @param {Object} node - Candidate enclosing node
 * @param {Object} path - Path to test
 * @returns {boolean}
 */
const containsPath = (node, path) => {
  for (let current = path; current; current = current.parentPath) {
    if (current.value === node) return true;
  }

  return false;
};

/**
 * The node a declaration is confined to: the nearest enclosing `BlockStatement` for `const` and
 * `let`, and the function the AST library reports for `var`, which is not block-scoped.
 *
 * Always a node, never null — a `var` whose scope happens to equal what the lookup already
 * returns still has to take part in the ambiguity test below, or two of them in one function
 * would both be tracked.
 *
 * @param {Object} declaratorPath - Path of the VariableDeclarator
 * @returns {Object} The node the declaration is confined to
 */
const scopeOfDeclaration = (declaratorPath) => {
  const declaration = declaratorPath.parentPath && declaratorPath.parentPath.parentPath;
  if (!declaration || !BLOCK_SCOPED_KINDS.has(declaration.value.kind)) return declaratorPath.scope.node;

  for (let current = declaratorPath; current; current = current.parentPath) {
    const type = current.value && current.value.type;
    if (type === 'BlockStatement' || type === 'Program') return current.value;
  }

  return declaratorPath.scope.node;
};

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
  if (!scope || scope.node !== binding.scopeNode) return false;

  // a parameter carries no block and keeps the function-scope answer the lookup already gave
  if (!binding.blockNode) return true;

  // a block-scoped declaration reaches its own block, minus whatever a nested one shadows
  if (!containsPath(binding.blockNode, path)) return false;

  return !binding.shadows.some((shadowed) => containsPath(shadowed, path));
};

/**
 * Whether another declaration of the same name shares this one's scope, leaving a reference in
 * it unattributable. Only an exact scope collision qualifies — two `var`s in one function, say.
 *
 * Nesting is *not* ambiguity: an inner declaration shadows the outer one, and which is meant is
 * decided by where the reference sits. `shadowsWithin` records that, so sibling blocks and
 * shadowing pairs both resolve instead of both being dropped.
 *
 * @param {Object} declaration - { name, path, blockNode }
 * @param {Array} declarations - Every declaration found, this one included
 * @returns {boolean}
 */
const isAmbiguous = (declaration, declarations) =>
  declarations.some(
    (other) =>
      other !== declaration && other.name === declaration.name && other.blockNode === declaration.blockNode
  );

/**
 * The scopes of same-name declarations nested inside this one's, which its references cannot
 * reach past:
 *
 *   const r = await pm.sendRequest(q);   // this binding
 *   if (x) { const r = cached; r.code }  // `r` here is the inner one, not ours
 *
 * Every declaration counts, not only the ones that could be typed — an untyped shadower still
 * takes the name over inside its own block.
 *
 * @param {Object} declaration - { name, path, blockNode }
 * @param {Array} declarations - Every declaration found
 * @returns {Array<Object>} Scope nodes this binding does not reach into
 */
const shadowsWithin = (declaration, declarations) =>
  declarations
    .filter(
      (other) =>
        other !== declaration
        && other.name === declaration.name
        && other.blockNode !== declaration.blockNode
        && containsPath(declaration.blockNode, other.path)
    )
    .map((other) => other.blockNode);

/**
 * The declarator an identifier reference resolves to, or null when nothing can claim it.
 *
 * Ambiguity is decided the same way `collectBindings` decides it — by containment, not by a
 * per-scope count. The AST library models function scope, so counting declarations in the scope
 * a lookup reports drops two sibling blocks that are in fact independent.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} root - Collection of the enclosing Program
 * @param {Object} referencePath - Path of the reference to resolve
 * @param {string} name - Name being referenced
 * @returns {Object|null} Path of the declarator
 */
const findBindingDeclarator = (j, root, referencePath, name) => {
  const declarations = root
    .find(j.VariableDeclarator)
    .paths()
    .filter((path) => path.value.id.type === 'Identifier')
    .map((path) => ({ name: path.value.id.name, path, blockNode: scopeOfDeclaration(path) }));

  const match = declarations.find(
    (declaration) =>
      declaration.name === name
      && !isAmbiguous(declaration, declarations)
      && resolvesToBinding(referencePath, {
        name,
        scopeNode: declaration.path.scope.node,
        blockNode: declaration.blockNode,
        shadows: shadowsWithin(declaration, declarations)
      })
  );

  return match ? match.path : null;
};

/**
 * The object literal an identifier reference resolves to, following a chain of aliases.
 *
 * Only the declaration the reference actually resolves to is reached: an unrelated object
 * sharing the name is left alone, and a shadowed outer declaration is not reached.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} root - Collection of the enclosing Program
 * @param {Object} referencePath - Path of the reference to resolve
 * @param {string} name - Name being referenced
 * @param {Set} visited - Declarators already followed, to stop a circular chain
 * @returns {Object|null} The ObjectExpression node, or null if the reference does not reach one
 */
export const resolveReferencedObject = (j, root, referencePath, name, visited = new Set()) => {
  const declaratorPath = findBindingDeclarator(j, root, referencePath, name);
  if (!declaratorPath || visited.has(declaratorPath.value)) return null;
  visited.add(declaratorPath.value);

  const init = declaratorPath.value.init;
  if (!init) return null;

  if (init.type === 'ObjectExpression') return init;

  // the variable references another variable — follow the chain from its own declaration
  if (init.type === 'Identifier') {
    return resolveReferencedObject(j, root, declaratorPath.get('init'), init.name, visited);
  }

  return null;
};

/**
 * Whether the binding is written to anywhere in the given subtree, which makes what it holds
 * unknowable from its declaration alone.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} ast - jscodeshift Collection to search within
 * @param {Object} binding - { name, scopeNode }
 * @returns {boolean}
 */
export const isReassigned = (j, ast, binding) => {
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
 * Every member access on a typed receiver that the registry has a row for.
 *
 * Collected before any replacement is applied: maps rename one member onto another member's
 * name — `code -> status` alongside `status -> statusText` — so a pass that replaced as it
 * walked would re-match what it had just written.
 *
 * @param {Object} j - jscodeshift API
 * @param {Object} root - jscodeshift Collection to search within
 * @param {Array} bindings - Typed bindings in scope
 * @param {Object} registry - The API registry
 * @returns {Array<{path: Object, propertyName: string, spec: Object}>}
 */
export const collectMemberTargets = (j, root, bindings, registry) =>
  root
    .find(j.MemberExpression)
    .paths()
    .map((path) => {
      const receiverType = getExpressionType(path.get('object'), bindings, registry);
      if (!receiverType) return null;

      const members = registry.types[receiverType];
      const propertyName = getStaticPropertyName(path.value);
      const spec = propertyName && members && members[propertyName];

      return spec ? { path, propertyName, spec } : null;
    })
    .filter(Boolean);

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

  const declarations = ast
    .find(j.VariableDeclarator)
    .paths()
    .filter((path) => path.value.id.type === 'Identifier')
    .map((path) => ({ name: path.value.id.name, path, blockNode: scopeOfDeclaration(path) }));

  const candidates = declarations
    .filter((declaration) => declaration.path.value.init && !isAmbiguous(declaration, declarations))
    .map((declaration) => ({ ...declaration, shadows: shadowsWithin(declaration, declarations) }));

  /**
   * A binding can be typed from one typed in an earlier round, so the sweep repeats until a
   * round adds nothing. Only pushing a binding sets `grew`, which is what ends it.
   */
  let grew = true;

  while (grew) {
    grew = false;

    candidates.forEach(({ name, path, blockNode, shadows }) => {
      const scopeNode = path.scope.node;

      if (bindings.some((known) => known.name === name && known.path === path)) return;

      const typeName = getExpressionType(path.get('init'), bindings, registry);
      if (!typeName) return;

      const binding = { name, scopeNode, blockNode, shadows, typeName, path };
      if (isReassigned(j, ast, binding)) return;

      bindings.push(binding);
      grew = true;
    });
  }

  return bindings;
};
