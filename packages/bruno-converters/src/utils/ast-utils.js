const j = require('jscodeshift');

/**
 * Efficiently builds a string representation of a member expression
 * without using toSource() for better performance.
 *
 * @param {Object} node - The member expression node from the AST
 * @returns {string} - String representation of the member expression (e.g., "pm.environment.get")
 *
 * @example
 * // For AST node representing `pm.environment.get`
 * getMemberExpressionString(node) // returns "pm.environment.get"
 *
 * // For AST node representing `obj["prop"]`
 * getMemberExpressionString(node) // returns "obj.prop"
 *
 * // For AST node representing `bru.cookies.jar()`
 * getMemberExpressionString(node) // returns "bru.cookies.jar()"
 */
export function getMemberExpressionString(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'CallExpression') {
    const calleeStr = getMemberExpressionString(node.callee);
    return `${calleeStr}()`;
  }

  if (node.type === 'MemberExpression') {
    const objectStr = getMemberExpressionString(node.object);

    // For computed properties like obj[prop]
    if (node.computed) {
      // For string literals like obj["prop"], include them in the string
      if (node.property.type === 'Literal' && typeof node.property.value === 'string') {
        return `${objectStr}.${node.property.value}`;
      }
      // For other computed properties, we can't reliably represent them
      return `${objectStr}.[computed]`;
    }

    // For regular property access like obj.prop
    if (node.property.type === 'Identifier') {
      return `${objectStr}.${node.property.name}`;
    }
  }

  return '[unsupported]';
}

/**
 * Builds a member expression AST node from a dotted string path.
 *
 * @param {string} str - Dotted path string (e.g., "pm.variables.get")
 * @returns {Object} - jscodeshift MemberExpression or Identifier node
 *
 * @example
 * buildMemberExpressionFromString("pm.variables.get")
 * // Returns AST for: pm.variables.get
 *
 * buildMemberExpressionFromString("pm")
 * // Returns AST for: pm (just an Identifier)
 */
export function buildMemberExpressionFromString(str) {
  const parts = str.split('.');
  let expr = j.identifier(parts[0]);
  for (let i = 1; i < parts.length; i += 1) {
    expr = j.memberExpression(expr, j.identifier(parts[i]));
  }
  return expr;
}

/**
 * Checks if a node is an identifier with a specific name.
 *
 * @param {Object} node - The AST node to check
 * @param {string} name - The expected identifier name
 * @returns {boolean} - True if node is an identifier with the given name
 */
export function isIdentifierNamed(node, name) {
  return node && node.type === 'Identifier' && node.name === name;
}

/**
 * Checks if a node is a function literal, so its body is in reach of the pass.
 * A handler passed by reference — `.then(handleIt)` — is neither.
 *
 * @param {Object} node - The AST node to check
 * @returns {boolean} - True if node is a function or arrow function expression
 */
export function isFunctionExpression(node) {
  return Boolean(node) && (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression');
}

/**
 * Checks if a node is the null literal.
 *
 * @param {Object} node - The AST node to check
 * @returns {boolean} - True if node is a null literal
 */
export function isNullLiteral(node) {
  return node && node.type === 'Literal' && node.value === null;
}

/**
 * Gets the statically-known property name of a member expression. A computed access
 * with a non-literal key (`p[someVar]`) has no static name — even an Identifier key
 * named `then` is a variable there, not the method.
 *
 * @param {Object} memberExpr - MemberExpression node
 * @returns {string|null} - The property name, or null if it isn't statically known
 */
export function getStaticPropertyName(memberExpr) {
  const property = memberExpr.property;

  if (memberExpr.computed) {
    return property.type === 'Literal' && typeof property.value === 'string' ? property.value : null;
  }
  return property.type === 'Identifier' ? property.name : null;
}

/**
 * The declarator an identifier reference resolves to, or null when it cannot be attributed to
 * exactly one.
 *
 * ast-types models function scope rather than block scope, so two declarations of one name in
 * nested blocks of the same function are indistinguishable — the same reason `collectBindings`
 * drops a name declared more than once in a scope.
 *
 * @param {Object} root - Collection of the enclosing Program
 * @param {Object} referencePath - Path of the reference to resolve
 * @param {string} name - Name being referenced
 * @returns {Object|null} - Path of the declarator
 */
function findBindingDeclarator(root, referencePath, name) {
  const scope = referencePath.scope && referencePath.scope.lookup(name);
  if (!scope) return null;

  const declarators = root
    .find(j.VariableDeclarator, { id: { name } })
    .paths()
    .filter((declaratorPath) => declaratorPath.scope.node === scope.node);

  return declarators.length === 1 ? declarators[0] : null;
}

/**
 * The object literal an identifier reference resolves to, following a chain of aliases.
 *
 * Only the declaration the reference actually resolves to is reached: an unrelated object
 * sharing the name is left alone, and a shadowed outer declaration is not reached.
 *
 * @param {Object} root - Collection of the enclosing Program
 * @param {Object} referencePath - Path of the reference to resolve
 * @param {string} name - Name being referenced
 * @param {Set} visited - Declarators already followed, to stop a circular chain
 * @returns {Object|null} - The ObjectExpression node, or null if the reference does not reach one
 */
export function resolveReferencedObject(root, referencePath, name, visited = new Set()) {
  const declaratorPath = findBindingDeclarator(root, referencePath, name);
  if (!declaratorPath || visited.has(declaratorPath.value)) return null;
  visited.add(declaratorPath.value);

  const init = declaratorPath.value.init;
  if (!init) return null;

  if (init.type === 'ObjectExpression') return init;

  // the variable references another variable — follow the chain from its own declaration
  if (init.type === 'Identifier') {
    return resolveReferencedObject(root, declaratorPath.get('init'), init.name, visited);
  }

  return null;
}

/**
 * Reports a member the translation could not carry across. The script is left exactly as
 * written, so this is the only record that the case was reached — it names the member and,
 * where the parser recorded one, the line it sat on.
 *
 * @param {Object} node - The node being reported
 * @param {string} member - Member name as the source script spelled it
 * @param {string} reason - Why it could not be translated
 */
export function reportUntranslated(node, member, reason) {
  const line = node.loc ? ` (line ${node.loc.start.line})` : '';

  console.warn(`bruno-converter: ${member}${line} — ${reason}`);
}
