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
 * Checks if a node is the null literal.
 *
 * @param {Object} node - The AST node to check
 * @returns {boolean} - True if node is a null literal
 */
export function isNullLiteral(node) {
  return node && node.type === 'Literal' && node.value === null;
}
