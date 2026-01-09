const j = require('jscodeshift');
const cloneDeep = require('lodash/cloneDeep');
const {
  getMemberExpressionString,
  buildMemberExpressionFromString,
  isIdentifierNamed,
  isNullLiteral
} = require('./ast-utils');

// =============================================================================
// SIMPLE TRANSLATIONS
// =============================================================================

/**
 * Simple 1:1 translations from Bruno helpers to Postman helpers.
 * These are direct member expression replacements.
 */
const simpleTranslations = {
  // Global variables
  'bru.getGlobalEnvVar': 'pm.globals.get',
  'bru.setGlobalEnvVar': 'pm.globals.set',

  // Environment variables
  'bru.getEnvVar': 'pm.environment.get',
  'bru.setEnvVar': 'pm.environment.set',
  'bru.deleteEnvVar': 'pm.environment.unset',
  'bru.getEnvName': 'pm.environment.name',

  // Variables
  'bru.getVar': 'pm.variables.get',
  'bru.setVar': 'pm.variables.set',
  'bru.hasVar': 'pm.variables.has',
  'bru.deleteVar': 'pm.variables.unset',
  'bru.interpolate': 'pm.variables.replaceIn',

  // Collection variables (map to pm.variables.*)
  'bru.collection.getVar': 'pm.variables.get',
  'bru.collection.setVar': 'pm.variables.set',
  'bru.collection.hasVar': 'pm.variables.has',
  'bru.collection.deleteVar': 'pm.variables.unset',

  // Execution control
  'bru.setNextRequest': 'pm.setNextRequest',
  'bru.runner.skipRequest': 'pm.execution.skipRequest',
  'bru.runner.setNextRequest': 'pm.execution.setNextRequest',

  // Request helpers
  'req.getUrl': 'pm.request.url',
  'req.getMethod': 'pm.request.method',
  'req.getHeaders': 'pm.request.headers',
  'req.getBody': 'pm.request.body',
  'req.getName': 'pm.info.requestName',

  // Response helpers
  'res.getBody': 'pm.response.json',
  'res.getStatus': 'pm.response.code',
  'res.statusText': 'pm.response.statusText',
  'res.getResponseTime': 'pm.response.responseTime',
  'res.getHeaders': 'pm.response.headers',
  'res.getHeader': 'pm.response.headers.get',

  // Cookies jar
  'bru.cookies.jar': 'pm.cookies.jar',

  // Testing
  'expect.fail': 'pm.expect.fail'
};

// =============================================================================
// COMPLEX TRANSFORMATIONS
// =============================================================================

/**
 * Complex transformations that require custom handling beyond simple replacements.
 * Each transformation has a pattern to match and a transform function.
 *
 * Note: These are processed in order, so more specific patterns should come first.
 */
const complexTransformations = [
  // bru.runner.stopExecution() -> pm.execution.setNextRequest(null)
  {
    pattern: 'bru.runner.stopExecution',
    transform: (path) => {
      return j.callExpression(
        buildMemberExpressionFromString('pm.execution.setNextRequest'),
        [j.literal(null)]
      );
    }
  },

  // res.getSize() -> pm.response.size()
  {
    pattern: 'res.getSize',
    transform: (path) => {
      // Just replace the callee, keep the call structure
      path.get('callee').replace(buildMemberExpressionFromString('pm.response.size'));
      return null; // Signal that we modified in place
    }
  },

  // JSON.stringify(res.getBody()) -> pm.response.text()
  {
    pattern: 'JSON.stringify',
    condition: (path) => {
      const args = path.value.arguments;
      if (args.length !== 1) return false;

      const arg = args[0];
      if (arg.type !== 'CallExpression' || arg.callee.type !== 'MemberExpression') return false;

      return getMemberExpressionString(arg.callee) === 'res.getBody';
    },
    transform: () => {
      return j.callExpression(
        buildMemberExpressionFromString('pm.response.text'),
        []
      );
    }
  }
];

// Create a map for O(1) lookups of complex transformations
const complexTransformationsMap = new Map();
complexTransformations.forEach((t) => {
  complexTransformationsMap.set(t.pattern, t);
});

// Cookie jar method mappings (Bruno -> Postman)
const cookieMethodMapping = {
  getCookie: 'get',
  getCookies: 'getAll',
  setCookie: 'set',
  deleteCookie: 'unset',
  deleteCookies: 'clear'
};

// =============================================================================
// TRANSFORMATION FUNCTIONS
// =============================================================================

/**
 * Process simple member expression translations (bru.* -> pm.*)
 * and complex transformations in a single pass.
 *
 * @param {Object} ast - jscodeshift AST
 * @param {Object} changeTracker - Object to track if changes were made
 */
function processAllTransformations(ast, changeTracker) {
  // First handle CallExpressions for complex transformations
  ast.find(j.CallExpression).forEach((path) => {
    const { callee } = path.value;
    if (callee.type !== 'MemberExpression') return;

    const memberExprStr = getMemberExpressionString(callee);
    const transform = complexTransformationsMap.get(memberExprStr);

    if (transform) {
      // Check condition if present
      if (transform.condition && !transform.condition(path)) return;

      const replacement = transform.transform(path);
      if (replacement !== null) {
        j(path).replaceWith(replacement);
        changeTracker.changed = true;
      } else {
        // Transform modified in place
        changeTracker.changed = true;
      }
    }
  });

  // Then handle simple member expression translations
  ast.find(j.MemberExpression).forEach((path) => {
    const memberExprStr = getMemberExpressionString(path.value);

    if (!Object.prototype.hasOwnProperty.call(simpleTranslations, memberExprStr)) return;

    const replacement = simpleTranslations[memberExprStr];
    j(path).replaceWith(buildMemberExpressionFromString(replacement));
    changeTracker.changed = true;
  });
}

/**
 * Transform cookie jar method calls.
 * Handles both direct calls and variables assigned to cookie jars.
 *
 * @param {Object} ast - jscodeshift AST
 * @param {Object} changeTracker - Object to track if changes were made
 */
function transformCookieJarMethods(ast, changeTracker) {
  // Track variables assigned to cookie jar instances
  const cookieJarVars = new Set();

  // Find variables assigned to cookie jar
  ast.find(j.VariableDeclarator).forEach((path) => {
    if (path.value.init?.type === 'CallExpression' && path.value.init.callee.type === 'MemberExpression') {
      const calleeStr = getMemberExpressionString(path.value.init.callee);
      if (calleeStr === 'bru.cookies.jar' || calleeStr === 'pm.cookies.jar') {
        if (path.value.id.type === 'Identifier') {
          cookieJarVars.add(path.value.id.name);
        }
      }
    }
  });

  // Transform method calls on cookie jars
  ast.find(j.CallExpression).forEach((path) => {
    const { callee } = path.value;
    if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return;

    const methodName = callee.property.name;
    if (!cookieMethodMapping[methodName]) return;

    // Check if object is a direct jar() call or a jar variable
    const isDirectJarCall = callee.object.type === 'CallExpression'
      && callee.object.callee.type === 'MemberExpression'
      && ['bru.cookies.jar', 'pm.cookies.jar'].includes(getMemberExpressionString(callee.object.callee));

    const isJarVariable = callee.object.type === 'Identifier' && cookieJarVars.has(callee.object.name);

    if (isDirectJarCall || isJarVariable) {
      path.value.callee.property.name = cookieMethodMapping[methodName];
      changeTracker.changed = true;
    }
  });
}

/**
 * Check if a call expression matches bru.getEnvVar pattern.
 *
 * @param {Object} node - The AST node to check
 * @returns {boolean} - True if node is a bru.getEnvVar call
 */
function isGetEnvVarCall(node) {
  if (!node || node.type !== 'CallExpression') return false;
  if (!node.callee || node.callee.type !== 'MemberExpression') return false;
  return getMemberExpressionString(node.callee) === 'bru.getEnvVar';
}

/**
 * Compare argument arrays by comparing their source representation.
 *
 * @param {Array} args1 - First argument array
 * @param {Array} args2 - Second argument array
 * @returns {boolean} - True if arguments are equivalent
 */
function argsAreEqual(args1, args2) {
  if (args1.length !== args2.length) return false;
  for (let i = 0; i < args1.length; i++) {
    const source1 = j(args1[i]).toSource();
    const source2 = j(args2[i]).toSource();
    if (source1 !== source2) return false;
  }
  return true;
}

/**
 * Transform the Bruno env.has pattern back to pm.environment.has.
 * Pattern: bru.getEnvVar("x") !== undefined && bru.getEnvVar("x") !== null
 *       -> pm.environment.has("x")
 *
 * @param {Object} ast - jscodeshift AST
 * @param {Object} changeTracker - Object to track if changes were made
 */
function transformEnvHas(ast, changeTracker) {
  ast.find(j.LogicalExpression, { operator: '&&' }).forEach((path) => {
    const { left, right } = path.value;

    // Both sides must be binary expressions with !==
    if (left.type !== 'BinaryExpression' || left.operator !== '!==') return;
    if (right.type !== 'BinaryExpression' || right.operator !== '!==') return;

    // Left side: bru.getEnvVar(...) !== undefined
    if (!isGetEnvVarCall(left.left) || !isIdentifierNamed(left.right, 'undefined')) return;

    // Right side: bru.getEnvVar(...) !== null
    if (!isGetEnvVarCall(right.left) || !isNullLiteral(right.right)) return;

    // Arguments must be the same
    const leftArgs = left.left.arguments || [];
    const rightArgs = right.left.arguments || [];
    if (!argsAreEqual(leftArgs, rightArgs)) return;

    // Replace with pm.environment.has(...)
    const newCall = j.callExpression(
      buildMemberExpressionFromString('pm.environment.has'),
      cloneDeep(leftArgs)
    );
    j(path).replaceWith(newCall);
    changeTracker.changed = true;
  });
}

/**
 * Transform expect assertions for response properties.
 *
 * Transforms:
 * - expect(res.getStatus()).to.equal(X) -> pm.response.to.have.status(X)
 * - expect(res.getBody()).to.equal(X) -> pm.response.to.have.body(X)
 * - expect(res.getHeaders()).to.have.property(X) -> pm.response.to.have.header(X)
 *
 * @param {Object} ast - jscodeshift AST
 * @param {Object} changeTracker - Object to track if changes were made
 */
function transformExpectAssertions(ast, changeTracker) {
  ast.find(j.CallExpression).forEach((path) => {
    const { callee, arguments: args } = path.value;
    if (callee.type !== 'MemberExpression') return;

    // Traverse up to find expect(...) call and build chain method string
    let current = callee;
    const pathParts = [];

    while (current && current.type === 'MemberExpression') {
      if (current.property?.type === 'Identifier') {
        pathParts.unshift(current.property.name);
      }
      current = current.object;
    }

    // Current should now be expect(...) call
    if (!current || current.type !== 'CallExpression') return;
    if (!current.callee || current.callee.type !== 'Identifier' || current.callee.name !== 'expect') return;

    const expectArgs = current.arguments;
    if (expectArgs.length === 0) return;

    const expectArg = expectArgs[0];
    const chainMethod = pathParts.join('.');

    // Get the expect target (what's being tested)
    let expectTarget = '';
    if (expectArg.type === 'CallExpression' && expectArg.callee.type === 'MemberExpression') {
      expectTarget = getMemberExpressionString(expectArg.callee);
    }

    // Transform based on pattern
    let newCall = null;

    if (expectTarget === 'res.getStatus' && chainMethod === 'to.equal') {
      newCall = j.callExpression(
        buildMemberExpressionFromString('pm.response.to.have.status'),
        cloneDeep(args)
      );
    } else if (expectTarget === 'res.getBody' && chainMethod === 'to.equal') {
      newCall = j.callExpression(
        buildMemberExpressionFromString('pm.response.to.have.body'),
        cloneDeep(args)
      );
    } else if (expectTarget === 'res.getHeaders' && chainMethod === 'to.have.property') {
      newCall = j.callExpression(
        buildMemberExpressionFromString('pm.response.to.have.header'),
        cloneDeep(args)
      );
    }

    if (newCall) {
      j(path).replaceWith(newCall);
      changeTracker.changed = true;
    }
  });
}

/**
 * Transform test() -> pm.test() and expect() -> pm.expect()
 *
 * @param {Object} ast - jscodeshift AST
 * @param {Object} changeTracker - Object to track if changes were made
 */
function transformTestsAndExpect(ast, changeTracker) {
  // Transform test(...) -> pm.test(...)
  ast.find(j.CallExpression, { callee: { type: 'Identifier', name: 'test' } })
    .forEach((path) => {
      j(path.get('callee')).replaceWith(
        j.memberExpression(j.identifier('pm'), j.identifier('test'))
      );
      changeTracker.changed = true;
    });

  // Transform expect(...) -> pm.expect(...)
  ast.find(j.CallExpression, { callee: { type: 'Identifier', name: 'expect' } })
    .forEach((path) => {
      j(path.get('callee')).replaceWith(
        j.memberExpression(j.identifier('pm'), j.identifier('expect'))
      );
      changeTracker.changed = true;
    });
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Translate Bruno scripts back to Postman-compatible scripts.
 *
 * This function transforms Bruno API calls (bru.*, req.*, res.*, test(), expect())
 * back to their Postman equivalents (pm.*, pm.request.*, pm.response.*, pm.test(), pm.expect()).
 *
 * @param {string} code - Bruno script string
 * @returns {string} - Postman-compatible script string
 *
 * @example
 * translateBruToPostman('bru.getEnvVar("test");')
 * // Returns: 'pm.environment.get("test");'
 *
 * @example
 * translateBruToPostman('const data = res.getBody();')
 * // Returns: 'const data = pm.response.json();'
 */
function translateBruToPostman(code) {
  if (!code || typeof code !== 'string') {
    return code;
  }

  try {
    const ast = j(code);
    const changeTracker = { changed: false };

    // Order matters: complex transformations that detect bru.* patterns
    // must run BEFORE simple translations that would replace those patterns

    // 1. Transform env.has pattern (detects bru.getEnvVar)
    transformEnvHas(ast, changeTracker);

    // 2. Transform expect assertions (detects res.* patterns)
    transformExpectAssertions(ast, changeTracker);

    // 3. Process all member expression transformations (simple + complex)
    processAllTransformations(ast, changeTracker);

    // 4. Transform cookie jar methods
    transformCookieJarMethods(ast, changeTracker);

    // 5. Transform test/expect (must run after other transformations)
    transformTestsAndExpect(ast, changeTracker);

    // If no changes were made, return original to preserve formatting
    if (!changeTracker.changed) {
      return code;
    }

    return ast.toSource();
  } catch (e) {
    // If translation fails, return original code
    console.warn('Error in Bruno to Postman translation:', e);
    return code;
  }
}

module.exports = translateBruToPostman;
module.exports.default = translateBruToPostman;
