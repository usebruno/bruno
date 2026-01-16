import {
  getMemberExpressionString,
  buildMemberExpressionFromString
} from './ast-utils';
const j = require('jscodeshift');

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
  'bru.hasEnvVar': 'pm.environment.has',
  'bru.deleteEnvVar': 'pm.environment.unset',
  // Note: bru.getEnvName() is handled in complexTransformations because it's a function -> property conversion

  // Runtime variables
  'bru.getVar': 'pm.variables.get',
  'bru.setVar': 'pm.variables.set',
  'bru.hasVar': 'pm.variables.has',
  'bru.deleteVar': 'pm.variables.unset',
  // 'bru.deleteAllVars':  Postman does not have a way to delete all variables

  // Collection variables
  'bru.getCollectionVar': 'pm.variables.get',
  /* Bruno does not have a way to set, has or delete collection variables */

  // Folder variables
  'bru.getFolderVar': 'pm.variables.get',
  /* Bruno does not have a way to set, has or delete folder variables */

  // Request variables (map to pm.variables.*)
  'bru.getRequestVar': 'pm.variables.get',
  /* Bruno does not have a way to set, has or delete request variables */

  // Interpolation
  'bru.interpolate': 'pm.variables.replaceIn',

  // Execution control
  'bru.setNextRequest': 'pm.execution.setNextRequest',
  'bru.runner.skipRequest': 'pm.execution.skipRequest',
  'bru.runner.setNextRequest': 'pm.execution.setNextRequest',

  // Request helpers
  // Note: req.getUrl(), req.getMethod(), req.getHeaders(), req.getBody(), req.getName() are handled
  // in complexTransformations because they're function -> property conversions
  'req.getHeader': 'pm.request.headers.get',
  'req.setHeader': 'pm.request.headers.set',

  // Response helpers
  // Note: res.getStatus(), res.getResponseTime(), res.getHeaders() are handled
  // in complexTransformations because they're function -> property conversions
  'res.status': 'pm.response.code',
  'res.statusText': 'pm.response.status',
  'res.body': 'pm.response.body',
  'res.getBody': 'pm.response.json',
  'res.getHeader': 'pm.response.headers.get',
  'res.getSize': 'pm.response.size',

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
  },

  // bru.getEnvName() -> pm.environment.name (function to property)
  {
    pattern: 'bru.getEnvName',
    transform: () => {
      // Replace the entire call expression with just the member expression (property access)
      return buildMemberExpressionFromString('pm.environment.name');
    }
  },

  // Request helpers: function -> property conversions
  // req.getUrl() -> pm.request.url
  {
    pattern: 'req.getUrl',
    transform: () => buildMemberExpressionFromString('pm.request.url')
  },
  // req.getMethod() -> pm.request.method
  {
    pattern: 'req.getMethod',
    transform: () => buildMemberExpressionFromString('pm.request.method')
  },
  // req.getHeaders() -> pm.request.headers
  {
    pattern: 'req.getHeaders',
    transform: () => buildMemberExpressionFromString('pm.request.headers')
  },
  // req.getBody() -> pm.request.body
  {
    pattern: 'req.getBody',
    transform: () => buildMemberExpressionFromString('pm.request.body')
  },
  // req.getName() -> pm.info.requestName
  {
    pattern: 'req.getName',
    transform: () => buildMemberExpressionFromString('pm.info.requestName')
  },

  // Response helpers: function -> property conversions
  // res.getStatus() -> pm.response.code
  {
    pattern: 'res.getStatus',
    transform: () => buildMemberExpressionFromString('pm.response.code')
  },
  // res.getStatusText() -> pm.response.status
  {
    pattern: 'res.getStatusText',
    transform: () => buildMemberExpressionFromString('pm.response.status')
  },
  // res.getResponseTime() -> pm.response.responseTime
  {
    pattern: 'res.getResponseTime',
    transform: () => buildMemberExpressionFromString('pm.response.responseTime')
  },
  // res.getHeaders() -> pm.response.headers
  {
    pattern: 'res.getHeaders',
    transform: () => buildMemberExpressionFromString('pm.response.headers')
  }
];

// Create a map for O(1) lookups of complex transformations
const complexTransformationsMap = new Map();
complexTransformations.forEach((t) => {
  complexTransformationsMap.set(t.pattern, t);
});

// Cookie jar method mappings (Bruno -> PM)
// Note: Bruno's setCookie with cookie object form is not supported (Postman only accepts url, name, value, callback?)
// Note: getCookies(url, callback?) -> getAll(url, options?, callback?)
//       PM docs treat callback as 2nd arg, likely handled internally to detect function vs options object
const cookieMethodMapping = {
  getCookie: 'get', // (url, name, callback?) -> (url, name, callback?)
  getCookies: 'getAll', // (url, callback?) -> (url, callback?) - PM handles internally
  setCookie: 'set', // (url, name, value, callback?) -> (url, name, value?, callback?)
  deleteCookie: 'unset', // (url, name, callback?) -> (url, name, callback?)
  deleteCookies: 'clear' // (url, callback?) -> (url, callback?)
};

// =============================================================================
// TRANSFORMATION FUNCTIONS
// =============================================================================

/**
 * Process simple member expression translations (bru.* -> pm.*)
 * and complex transformations in a single pass.
 *
 * @param {Object} ast - jscodeshift AST
 */
function processAllTransformations(ast) {
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
      }
    }
  });

  // Then handle simple member expression translations
  ast.find(j.MemberExpression).forEach((path) => {
    const memberExprStr = getMemberExpressionString(path.value);

    if (!Object.prototype.hasOwnProperty.call(simpleTranslations, memberExprStr)) return;

    const replacement = simpleTranslations[memberExprStr];
    j(path).replaceWith(buildMemberExpressionFromString(replacement));
  });
}

/**
 * Transform cookie jar method calls.
 * Handles both direct calls and variables assigned to cookie jars.
 *
 * @param {Object} ast - jscodeshift AST
 */
function transformCookieJarMethods(ast) {
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
    }
  });
}

/**
 * Transform test() -> pm.test() and expect() -> pm.expect()
 *
 * @param {Object} ast - jscodeshift AST
 */
function transformTestsAndExpect(ast) {
  // Transform test(...) -> pm.test(...)
  ast.find(j.CallExpression, { callee: { type: 'Identifier', name: 'test' } })
    .forEach((path) => {
      j(path.get('callee')).replaceWith(
        j.memberExpression(j.identifier('pm'), j.identifier('test'))
      );
    });

  // Transform expect(...) -> pm.expect(...)
  ast.find(j.CallExpression, { callee: { type: 'Identifier', name: 'expect' } })
    .forEach((path) => {
      j(path.get('callee')).replaceWith(
        j.memberExpression(j.identifier('pm'), j.identifier('expect'))
      );
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
    return '';
  }

  try {
    const ast = j(code);

    processAllTransformations(ast);
    transformCookieJarMethods(ast);
    transformTestsAndExpect(ast);

    return ast.toSource();
  } catch (e) {
    console.warn('Error in Bruno to Postman translation:', e);
    return code;
  }
}

export default translateBruToPostman;
