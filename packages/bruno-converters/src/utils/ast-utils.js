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
 * Whether a member expression is the callee of a call — `res.json()` rather than `res.json`.
 *
 * @param {Object} memberPath - Path of the MemberExpression
 * @returns {boolean}
 */
export function isMethodCall(memberPath) {
  const parent = memberPath.parent;

  return parent.value.type === 'CallExpression' && parent.value.callee === memberPath.value;
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
