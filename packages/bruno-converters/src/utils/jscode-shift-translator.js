const j = require('jscodeshift');

// Simple 1:1 translations for straightforward replacements
const simpleTranslations = {
  // Environment variables
  'pm.environment.get': 'bru.getEnvVar',
  'pm.environment.set': 'bru.setEnvVar',
  'pm.environment.name': 'bru.getEnvName()',
  'pm.environment.unset': 'bru.deleteEnvVar',
  
  // Variables
  'pm.variables.get': 'bru.getVar',
  'pm.variables.set': 'bru.setVar',
  'pm.variables.has': 'bru.hasVar',
  
  // Collection variables
  'pm.collectionVariables.get': 'bru.getVar',
  'pm.collectionVariables.set': 'bru.setVar',
  'pm.collectionVariables.has': 'bru.hasVar',
  'pm.collectionVariables.unset': 'bru.deleteVar',
  
  // Request flow control
  'pm.setNextRequest': 'bru.setNextRequest',
  
  // Testing
  'pm.test': 'test',
  'pm.expect': 'expect',
  'pm.expect.fail': 'expect.fail',
  
  // Response properties
  'pm.response.json': 'res.getBody',
  'pm.response.code': 'res.getStatus()',
  'pm.response.text': 'res.getBody()?.toString',
  'pm.response.responseTime': 'res.getResponseTime()',
  
  // Execution control
  'pm.execution.skipRequest': 'bru.runner.skipRequest',
  
  // Legacy Postman API (deprecated)
  'postman.setEnvironmentVariable': 'bru.setEnvVar',
  'postman.getEnvironmentVariable': 'bru.getEnvVar',
  'postman.clearEnvironmentVariable': 'bru.deleteEnvVar',
};

// Method translations for API objects
const methodTranslations = {
  // pm.environment methods
  'environment.get': 'getEnvVar',
  'environment.set': 'setEnvVar',
  'environment.has': 'hasEnvVar',
  'environment.unset': 'deleteEnvVar',
  'environment.name': 'getEnvName()',
  
  // pm.variables methods
  'variables.get': 'getVar',
  'variables.set': 'setVar',
  'variables.has': 'hasVar',
  'variables.unset': 'deleteVar',
  
  // pm.collectionVariables methods
  'collectionVariables.get': 'getVar',
  'collectionVariables.set': 'setVar',
  'collectionVariables.has': 'hasVar',
  'collectionVariables.unset': 'deleteVar',

  // pm.response methods
  'response.json': 'getBody',
  'response.code': 'getStatus()',
  'response.text': 'getBody()?.toString',
  'response.responseTime': 'getResponseTime()',
  'response.status': 'getStatus()',
  'response.body': 'getBody()',
};

// Mapping of Postman API objects to Bruno API
const apiObjectMapping = {
  'pm.environment': 'bru',
  'pm.variables': 'bru',
  'pm.collectionVariables': 'bru',
  'pm.test': 'test',
  'pm.expect': 'expect',
  'pm.response': 'res',
  'pm': '{ environment: bru, variables: bru, test: test, expect: expect, response: res }'
};

// Complex transformations that need custom handling
const complexTransformations = {
  // pm.environment.has requires special handling
  'pm.environment.has': {
    pattern: 'pm.environment.has',
    transform: (path, j) => {
      const callExpr = path.parent.value;
      if (callExpr.type !== 'CallExpression') return null;
      
      const arg = callExpr.arguments[0];
      
      // Create: bru.getEnvVar(arg) !== undefined && bru.getEnvVar(arg) !== null
      return j.logicalExpression(
        '&&',
        j.binaryExpression(
          '!==',
          j.callExpression(j.identifier('bru.getEnvVar'), [arg]),
          j.identifier('undefined')
        ),
        j.binaryExpression(
          '!==',
          j.callExpression(j.identifier('bru.getEnvVar'), [arg]),
          j.literal(null)
        )
      );
    }
  },
  
  // Handle pm.response.to.have.status
  'pm.response.to.have.status': {
    pattern: 'pm.response.to.have.status',
    transform: (path, j) => {
      const callExpr = path.parent.value;
      if (callExpr.type !== 'CallExpression') return null;
      
      const arg = callExpr.arguments[0];
      
      // Create: expect(res.getStatus()).to.equal(arg)
      return j.callExpression(
        j.memberExpression(
          j.callExpression(
            j.identifier('expect'),
            [
              j.callExpression(
                j.identifier('res.getStatus'),
                []
              )
            ]
          ),
          j.identifier('to.equal')
        ),
        [arg]
      );
    }
  },

  // handle 'pm.response.to.have.header' to expect(Object.keys(res.getHeaders())).to.include(arg)
  'pm.response.to.have.header': {
    pattern: 'pm.response.to.have.header',
    transform: (path, j) => {
      const callExpr = path.parent.value;
      if (callExpr.type !== 'CallExpression') return null;
  
      const arg = callExpr.arguments[0];
      
      // Create: expect(Object.keys(res.getHeaders())).to.include(arg)
      return j.callExpression(
        j.memberExpression(
          j.callExpression(
            j.identifier('expect'),
            [
              j.callExpression(
                j.memberExpression(
                  j.identifier('Object'),
                  j.identifier('keys')
                ),
                [
                  j.callExpression(
                    j.identifier('res.getHeaders'),
                    []
                  )
                ]
              )
            ]
          ),
          j.identifier('to.include')
        ),
        [arg]
      );
    }
  },

  // Handle pm.execution.setNextRequest(null)
  'pm.execution.setNextRequest': {
    pattern: 'pm.execution.setNextRequest',
    transform: (path, j) => {
      const callExpr = path.parent.value;
      if (callExpr.type !== 'CallExpression') return null;
      
      const arg = callExpr.arguments[0];
      
      // If argument is null or 'null', transform to bru.runner.stopExecution()
      if (
        (arg.type === 'Literal' && (arg.value === null || arg.value === 'null')) ||
        (arg.type === 'Identifier' && arg.name === 'null')
      ) {
        return j.callExpression(
          j.identifier('bru.runner.stopExecution'),
          []
        );
      }
      
      // Otherwise, keep as bru.setNextRequest with the same argument
      return j.callExpression(
        j.identifier('bru.setNextRequest'),
        callExpr.arguments
      );
    }
  },
  
  // Handle response.to.have.status through an alias
  'response.to.have.status': {
    pattern: 'response.to.have.status',
    transform: (path, j) => {
      const callExpr = path.parent.value;
      if (callExpr.type !== 'CallExpression') return null;
      
      const arg = callExpr.arguments[0];
      
      // Check if this is an alias (parent object is an identifier)
      if (path.value.object && 
          path.value.object.object && 
          path.value.object.object.type === 'Identifier') {
        
        const varName = path.value.object.object.name;
        
        // Create: varName.getStatus() === arg
        return j.binaryExpression(
          '===',
          j.callExpression(
            j.memberExpression(
              j.identifier(varName),
              j.identifier('getStatus')
            ),
            []
          ),
          arg
        );
      }
      
      return null;
    }
  },
};

/**
 * Translates Postman script code to Bruno script code
 * @param {string} code - The Postman script code to translate
 * @returns {string} The translated Bruno script code
 */
function translateCode(code) {
  const ast = j(code);
  
  // Keep track of transformed nodes to avoid double-processing
  const transformedNodes = new Set();
  
  // Phase 0: Find Postman API aliases
  const aliases = findPostmanAliases(ast);
  
  // Phase 1: Handle complex transformations first
  processComplexTransformations(ast, transformedNodes); 
  
  // Phase 2: Handle pm.response.to.have.status
  handleResponseToHaveStatus(ast);
  
  // Phase 3: Handle simple transformations
  processSimpleTransformations(ast, transformedNodes);
  
  // Phase 4: Special case for "pm" alias
  handleGlobalPmAlias(ast);
  
  // Phase 5: Transform aliased variables
  transformAliasedMethods(ast, aliases);
  
  // Phase 6: Handle tests["..."] = ... syntax
  handleTestsBracketNotation(ast);
  
  return ast.toSource();
}

/**
 * Helper function for simple replacements
 * @param {Object} path - jscodeshift path object
 * @param {Object} j - jscodeshift instance
 * @param {string} replacement - The replacement string
 */
function handleSimpleReplacement(path, j, replacement) {
  if (path.parent.value.type === 'CallExpression' && 
      path.parent.value.callee === path.value) {
    // For method calls like pm.environment.get("test")
    j(path).replaceWith(
      j.identifier(replacement)
    );
  } else {
    // For property access like pm.environment.name
    if (replacement.endsWith('()')) {
      // Replace with a CallExpression
      const fnName = replacement.slice(0, -2); // Remove the ()
      j(path).replaceWith(
        j.callExpression(
          j.identifier(fnName),
          []
        )
      );
    } else {
      // Just replace with the identifier
      j(path).replaceWith(
        j.identifier(replacement)
      );
    }
  }
}

/**
 * Process all simple transformations in the AST
 * @param {Object} ast - jscodeshift AST
 * @param {Set} transformedNodes - Set of already transformed nodes
 */
function processSimpleTransformations(ast, transformedNodes) {
  ast.find(j.MemberExpression).forEach(path => {
    if (transformedNodes.has(path.node)) return;
    
    const memberExprStr = j(path.value).toSource();
    
    // Check for simple transformations
    Object.keys(simpleTranslations).forEach(key => {
      if (memberExprStr === key) {
        const replacement = simpleTranslations[key];
        handleSimpleReplacement(path, j, replacement);
        transformedNodes.add(path.node);
      }
    });
  });
}

/**
 * Process all complex transformations in the AST
 * @param {Object} ast - jscodeshift AST
 * @param {Set} transformedNodes - Set of already transformed nodes
 */
function processComplexTransformations(ast, transformedNodes) {
  ast.find(j.MemberExpression).forEach(path => {
    if (transformedNodes.has(path.node)) return;
    
    const memberExprStr = j(path.value).toSource();
    
    // Check for complex transformations
    Object.values(complexTransformations).forEach(transform => {
      if (memberExprStr === transform.pattern && 
          path.parent.value.type === 'CallExpression') {
        const replacement = transform.transform(path, j);
        if (replacement) {
          j(path.parent).replaceWith(replacement);
          transformedNodes.add(path.node);
          transformedNodes.add(path.parent.node);
        }
      }
    });
  });
}

/**
 * Find variables assigned to Postman API objects
 * @param {Object} ast - jscodeshift AST
 * @returns {Map} Map of aliases to their Postman API objects
 */
function findPostmanAliases(ast) {
  const aliases = new Map();
  
  // Find direct assignments like: const env = pm.environment;
  findDirectAssignments(ast, aliases);
  
  // Find object destructuring like: const { environment, variables } = pm;
  findObjectDestructuring(ast, aliases);
  
  // Handle nested object assignments like: const api = { env: pm.environment, vars: pm.variables }
  findNestedObjectAssignments(ast, aliases);
  
  // Track reassignments through assignments
  findReassignments(ast, aliases);
  
  return aliases;
}

/**
 * Find direct assignments to Postman API objects
 * @param {Object} ast - jscodeshift AST
 * @param {Map} aliases - Map to store found aliases
 */
function findDirectAssignments(ast, aliases) {
  ast.find(j.VariableDeclarator).forEach(path => {
    const init = path.value.init;
    
    // Check for assignments to Postman API objects
    if (init && init.type === 'MemberExpression') {
      const source = j(init).toSource();
      if (apiObjectMapping[source]) {
        aliases.set(path.value.id.name, {
          type: source,
          replacement: apiObjectMapping[source]
        });
      }
    } else if (init && init.type === 'Identifier' && init.name === 'pm') {
      // Handle const postman = pm;
      aliases.set(path.value.id.name, {
        type: 'pm',
        replacement: apiObjectMapping['pm']
      });
    }
  });
}

/**
 * Find object destructuring of Postman API objects
 * @param {Object} ast - jscodeshift AST
 * @param {Map} aliases - Map to store found aliases
 */
function findObjectDestructuring(ast, aliases) {
  ast.find(j.VariableDeclarator, {
    id: { type: 'ObjectPattern' },
    init: { type: 'Identifier', name: 'pm' }
  }).forEach(path => {
    path.value.id.properties.forEach(prop => {
      if (prop.key.name && prop.value.type === 'Identifier') {
        const pmObject = `pm.${prop.key.name}`;
        if (apiObjectMapping[pmObject]) {
          aliases.set(prop.value.name, {
            type: pmObject,
            replacement: apiObjectMapping[pmObject]
          });
        }
      }
    });
  });
}

/**
 * Find nested object assignments to Postman API objects
 * @param {Object} ast - jscodeshift AST
 * @param {Map} aliases - Map to store found aliases
 */
function findNestedObjectAssignments(ast, aliases) {
  ast.find(j.Property).forEach(path => {
    const value = path.value.value;
    if (value && value.type === 'MemberExpression') {
      const source = j(value).toSource();
      if (apiObjectMapping[source]) {
        // We need to track the parent object and this property
        const parent = path.parent.parent.value;
        if (parent && parent.type === 'VariableDeclarator') {
          const parentName = parent.id.name;
          const propName = path.value.key.name;
          
          // Store as parentName.propName
          aliases.set(`${parentName}.${propName}`, {
            type: source,
            replacement: apiObjectMapping[source]
          });
        }
      }
    }
  });
}

/**
 * Find reassignments of Postman API objects
 * @param {Object} ast - jscodeshift AST
 * @param {Map} aliases - Map to store found aliases
 */
function findReassignments(ast, aliases) {
  ast.find(j.AssignmentExpression).forEach(path => {
    if (path.value.right.type === 'MemberExpression') {
      const source = j(path.value.right).toSource();
      if (apiObjectMapping[source]) {
        // Get the variable being assigned to
        const left = path.value.left;
        if (left.type === 'Identifier') {
          const varName = left.name;
          aliases.set(varName, {
            type: source,
            replacement: apiObjectMapping[source]
          });
        }
      }
    } else if (path.value.right.type === 'Identifier') {
      // Handle reassignment from one variable to another
      const rightVar = path.value.right.name;
      const leftVar = path.value.left.name;
      
      // If right side is an alias, the left side becomes the same type of alias
      if (aliases.has(rightVar)) {
        aliases.set(leftVar, {
          type: aliases.get(rightVar).type,
          replacement: aliases.get(rightVar).replacement
        });
      }
    }
  });
}

/**
 * Special case handler for pm.response.to.have.status
 * @param {Object} ast - jscodeshift AST
 */
function handleResponseToHaveStatus(ast) {
  ast.find(j.MemberExpression, {
    object: {
      type: 'MemberExpression',
      object: {
        type: 'MemberExpression',
        object: { name: 'pm' },
        property: { name: 'response' }
      },
      property: { name: 'to' }
    },
    property: { name: 'have' }
  }).forEach(path => {
    if (path.parent.value.type === 'MemberExpression' && 
        path.parent.value.property.name === 'status' &&
        path.parent.parent.value.type === 'CallExpression') {
      
      const callExpr = path.parent.parent.value;
      const arg = callExpr.arguments[0];
      
      // Transform to: expect(res.getStatus()).to.equal(arg)
      j(path.parent.parent).replaceWith(
        j.callExpression(
          j.memberExpression(
            j.callExpression(
              j.identifier('expect'),
              [
                j.callExpression(
                  j.identifier('res.getStatus'),
                  []
                )
              ]
            ),
            j.identifier('to.equal')
          ),
          [arg]
        )
      );
    }
  });
}

/**
 * Special case for handling global pm alias
 * @param {Object} ast - jscodeshift AST
 */
function handleGlobalPmAlias(ast) {
  // Find any variable that's initialized with pm
  ast.find(j.VariableDeclarator, {
    init: { type: 'Identifier', name: 'pm' }
  }).forEach(path => {
    const aliasVarName = path.value.id.name;
    
    // Replace pm with a proper object literal that includes all PM objects
    j(path.get('init')).replaceWith(
      j.objectExpression([
        j.property('init', j.identifier('environment'), j.identifier('bru')),
        j.property('init', j.identifier('variables'), j.identifier('bru')),
        j.property('init', j.identifier('test'), j.identifier('test')),
        j.property('init', j.identifier('expect'), j.identifier('expect')),
        j.property('init', j.identifier('response'), j.identifier('res'))
      ])
    );
    
    // Find and transform all usages of this alias
    transformGlobalPmAliasUsages(ast, aliasVarName);
  });
}

/**
 * Transform usages of global pm alias
 * @param {Object} ast - jscodeshift AST
 * @param {string} aliasVarName - The variable name that aliases pm
 */
function transformGlobalPmAliasUsages(ast, aliasVarName) {
  ast.find(j.MemberExpression, {
    object: { type: 'Identifier', name: aliasVarName }
  }).forEach(memberPath => {
    const propName = memberPath.value.property.name;
    
    // Handle aliasVar.environment.X, aliasVar.variables.X, etc.
    if (['environment', 'variables', 'collectionVariables'].includes(propName)) {
      // Check for chained methods like aliasVar.environment.get()
      if (memberPath.parent.value.type === 'MemberExpression') {
        const methodName = memberPath.parent.value.property.name;
        const methodKey = `${propName}.${methodName}`;
        
        if (methodTranslations[methodKey]) {
          memberPath.parent.value.property.name = methodTranslations[methodKey];
        }
      }
    } 
    // Special handling for response.to.have.status pattern
    else if (propName === 'response') {
      handleResponseAliasPattern(memberPath, aliasVarName);
    }
  });
}

/**
 * Handle response alias pattern transformations
 * @param {Object} memberPath - jscodeshift path to member expression
 * @param {string} aliasVarName - The variable name that aliases pm
 */
function handleResponseAliasPattern(memberPath, aliasVarName) {
  // Check for aliasVar.response.to.have.status() pattern
  if (memberPath.parent.value.type === 'MemberExpression' &&
      memberPath.parent.value.property.name === 'to') {
    
    const toExpr = memberPath.parent;
    
    if (toExpr.parent.value.type === 'MemberExpression' &&
        toExpr.parent.value.property.name === 'have') {
      
      const haveExpr = toExpr.parent;
      
      if (haveExpr.parent.value.type === 'MemberExpression' &&
          haveExpr.parent.value.property.name === 'status' &&
          haveExpr.parent.parent.value.type === 'CallExpression') {
        
        const statusCallExpr = haveExpr.parent.parent;
        const arg = statusCallExpr.value.arguments[0];
        
        // Replace with: aliasVar.response.getStatus() === arg
        j(statusCallExpr).replaceWith(
          j.binaryExpression(
            '===',
            j.callExpression(
              j.memberExpression(
                j.memberExpression(
                  j.identifier(aliasVarName),
                  j.identifier('response')
                ),
                j.identifier('getStatus')
              ),
              []
            ),
            arg
          )
        );
      }
    }
  }
}

/**
 * Transform variable usage based on aliases
 * @param {Object} ast - jscodeshift AST
 * @param {Map} aliases - Map of variable aliases
 */
function transformAliasedMethods(ast, aliases) {
  if (aliases.size === 0) return;
  
  // Transform method calls on aliased variables
  transformAliasedMethodCalls(ast, aliases);
  
  // Replace aliased variables in VariableDeclarators
  replaceAliasedVariables(ast, aliases);
  
  // Handle object destructuring assignments
  handleObjectDestructuringAssignments(ast);
  
  // Handle nested object assignments
  handleNestedObjectAssignments(ast);
  
  // Handle reassignments
  handleAliasReassignments(ast, aliases);
  
  // Transform CallExpression methods on aliased variables
  transformAliasedCallExpressions(ast, aliases);
  
  // Handle aliased global pm variables
  handleAliasedGlobalPmVariables(ast);
  
  // Additional handling for response.to.have.status when used as an alias
  handleResponseToHaveStatusAliases(ast, aliases);
}

/**
 * Transform method calls on aliased variables
 * @param {Object} ast - jscodeshift AST
 * @param {Map} aliases - Map of variable aliases
 */
function transformAliasedMethodCalls(ast, aliases) {
  ast.find(j.MemberExpression).forEach(path => {
    if (path.value.object.type === 'Identifier') {
      const varName = path.value.object.name;
      const alias = aliases.get(varName);
      
      if (alias) {
        const methodName = path.value.property.name;
        
        // Check if it's a method we should transform
        if (methodName) {
          const originalApi = alias.type.split('.')[1]; // Extract 'environment', 'variables', etc.
          const methodKey = `${originalApi}.${methodName}`;
          
          if (methodTranslations[methodKey]) {
            // Replace with the translated method
            path.value.property.name = methodTranslations[methodKey];
            
            // If this method is a direct property (not a function call) and has ()
            if (path.parent.value.type !== 'CallExpression' && 
                methodTranslations[methodKey].endsWith('()')) {
              // We need to convert to a function call
              const fnName = methodTranslations[methodKey].slice(0, -2);
              j(path).replaceWith(
                j.callExpression(
                  j.memberExpression(
                    j.identifier(varName),
                    j.identifier(fnName)
                  ),
                  []
                )
              );
            }
          }
        }
      }
    } else if (path.value.object.type === 'MemberExpression') {
      // Handle nested properties like api.env.get()
      if (path.value.object.object && path.value.object.object.type === 'Identifier') {
        const parentObj = path.value.object.object.name;
        const childProp = path.value.object.property.name;
        const fullPath = `${parentObj}.${childProp}`;
        
        const alias = aliases.get(fullPath);
        if (alias) {
          const methodName = path.value.property.name;
          const originalApi = alias.type.split('.')[1];
          const methodKey = `${originalApi}.${methodName}`;
          
          if (methodTranslations[methodKey]) {
            path.value.property.name = methodTranslations[methodKey];
          }
        }
      }
    }
  });
}

/**
 * Replace aliased variables in VariableDeclarators
 * @param {Object} ast - jscodeshift AST
 * @param {Map} aliases - Map of variable aliases
 */
function replaceAliasedVariables(ast, aliases) {
  ast.find(j.VariableDeclarator).forEach(path => {
    if (path.value.init && path.value.init.type === 'Identifier') {
      const varName = path.value.init.name;
      const alias = aliases.get(varName);
      
      if (alias && alias.replacement) {
        // Replace the variable with its Bruno equivalent
        j(path.get('init')).replaceWith(
          j.identifier(alias.replacement)
        );
      }
    } else if (path.value.init && path.value.init.type === 'MemberExpression') {
      const source = j(path.value.init).toSource();
      if (apiObjectMapping[source]) {
        // Replace the Postman API object with its Bruno equivalent
        j(path.get('init')).replaceWith(
          j.identifier(apiObjectMapping[source])
        );
      }
    }
  });
}

/**
 * Handle object destructuring assignments for PM objects
 * @param {Object} ast - jscodeshift AST
 */
function handleObjectDestructuringAssignments(ast) {
  ast.find(j.VariableDeclarator, {
    id: { type: 'ObjectPattern' },
    init: { type: 'Identifier', name: 'pm' }
  }).forEach(path => {
    // Create a simplified object expression based on the properties being destructured
    const properties = path.value.id.properties.map(prop => {
      // Only include properties that are actually being destructured
      const objName = `pm.${prop.key.name}`;
      return j.property(
        'init',
        j.identifier(prop.key.name),
        j.identifier(apiObjectMapping[objName] || objName)
      );
    });
    
    // Replace with a simplified object
    j(path.get('init')).replaceWith(
      j.objectExpression(properties)
    );
  });
}

/**
 * Handle nested object assignments with PM objects
 * @param {Object} ast - jscodeshift AST
 */
function handleNestedObjectAssignments(ast) {
  ast.find(j.Property).forEach(path => {
    const value = path.value.value;
    if (value && value.type === 'MemberExpression') {
      const source = j(value).toSource();
      if (apiObjectMapping[source]) {
        // Replace the Postman API object with its Bruno equivalent
        j(path.get('value')).replaceWith(
          j.identifier(apiObjectMapping[source])
        );
      }
    }
  });
}

/**
 * Handle reassignments of PM objects
 * @param {Object} ast - jscodeshift AST
 * @param {Map} aliases - Map of variable aliases
 */
function handleAliasReassignments(ast, aliases) {
  ast.find(j.AssignmentExpression).forEach(path => {
    if (path.value.right.type === 'MemberExpression') {
      const source = j(path.value.right).toSource();
      if (apiObjectMapping[source]) {
        // Replace the Postman API object with its Bruno equivalent
        j(path.get('right')).replaceWith(
          j.identifier(apiObjectMapping[source])
        );
      }
    }
  });
}

/**
 * Transform call expressions using aliased methods
 * @param {Object} ast - jscodeshift AST
 * @param {Map} aliases - Map of variable aliases
 */
function transformAliasedCallExpressions(ast, aliases) {
  // If no aliases are defined, nothing to do
  if (aliases.size === 0) return;

  // Find CallExpressions where the callee is a MemberExpression with an identifier object
  ast
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier' }
      }
    })
    .forEach(path => {
      const varName = path.value.callee.object.name;
      
      // Skip if the variable is not an alias
      if (!aliases.has(varName)) return;
      
      const alias = aliases.get(varName);
      const methodName = path.value.callee.property.name;
      
      // Extract the original API type (environment, variables, etc.)
      const originalApi = alias.type.split('.')[1];
      const methodKey = `${originalApi}.${methodName}`;
      
      // Replace method name with its Bruno equivalent if it exists
      if (methodTranslations[methodKey]) {
        path.value.callee.property.name = methodTranslations[methodKey];
      }
    });
}

/**
 * Handle aliased global pm variables
 * @param {Object} ast - jscodeshift AST
 */
function handleAliasedGlobalPmVariables(ast) {
  // Find direct method calls on the 'postman' global variable
  ast
    .find(j.MemberExpression, {
      object: { type: 'Identifier', name: 'postman' }
    })
    .forEach(path => {
      const propertyName = path.value.property.name;
      
      // Handle direct legacy API methods
      if (['setEnvironmentVariable', 'getEnvironmentVariable', 'clearEnvironmentVariable'].includes(propertyName)) {
        // These are handled by direct translations in simpleTranslations
        return;
      }
      
      // Look for chained properties like postman.environment.get
      handlePostmanChainedCalls(path);
    });
}

/**
 * Helper function to handle chained calls on the postman object
 * @param {Object} path - jscodeshift path to a MemberExpression
 */
function handlePostmanChainedCalls(path) {
  // Check if this member expression is part of a chain like postman.environment.get
  const parent = path.parent;
  
  if (parent.value.type !== 'MemberExpression') return;
  
  const propertyName = path.value.property.name;
  const subProperty = parent.value.property.name;
  
  // Only process known Postman object properties
  if (!['environment', 'variables', 'collectionVariables'].includes(propertyName)) return;
  
  // Only process known method names
  if (!['get', 'set', 'has', 'unset'].includes(subProperty)) return;
  
  // Translate method to Bruno equivalent
  const methodKey = `${propertyName}.${subProperty}`;
  if (methodTranslations[methodKey]) {
    parent.value.property.name = methodTranslations[methodKey];
  }
}

/**
 * Handle response.to.have.status when used as an alias
 * @param {Object} ast - jscodeshift AST
 * @param {Map} aliases - Map of variable aliases
 */
function handleResponseToHaveStatusAliases(ast, aliases) {
  // If no aliases are defined, nothing to do
  if (aliases.size === 0) return;

  // Find the pattern: something.to.have
  ast
    .find(j.MemberExpression, {
      object: {
        type: 'MemberExpression',
        property: { name: 'to' }
      },
      property: { name: 'have' }
    })
    // Filter to only include cases where the next part is '.status()'
    .filter(path => 
      path.parent.value.type === 'MemberExpression' && 
      path.parent.value.property.name === 'status' &&
      path.parent.parent.value.type === 'CallExpression'
    )
    .forEach(path => {
      transformResponseToHaveStatus(path, aliases);
    });
}

/**
 * Helper function to transform response.to.have.status for a specific path
 * @param {Object} path - jscodeshift path
 * @param {Map} aliases - Map of variable aliases
 */
function transformResponseToHaveStatus(path, aliases) {
  // Get the root object chain - could be response or something.response
  const toObject = path.value.object;
  const responseObject = toObject.object;
  
  // Handle direct alias case - when it's a simple variable like response.to.have.status()
  if (responseObject.type === 'Identifier') {
    const varName = responseObject.name;
    
    // Check if this variable is an alias for pm.response
    const alias = aliases.get(varName);
    if (alias && alias.type === 'pm.response') {
      transformToStatusAssertionForIdentifier(path, varName);
      return;
    }
  }
  
  // Handle nested alias case - when it's like tempPm.response.to.have.status()
  if (responseObject.type === 'MemberExpression' && 
      responseObject.property.name === 'response') {
    
    // Get the container object (tempPm in tempPm.response)
    const containerName = responseObject.object.name;
    
    // If it's a variable referencing pm
    const alias = aliases.get(containerName);
    if (alias && alias.type === 'pm') {
      transformToStatusAssertionForNestedProperty(path, containerName);
      return;
    }
  }
}

/**
 * Transform response.to.have.status() to response.getStatus() === arg 
 * when response is a direct alias
 * @param {Object} path - jscodeshift path
 * @param {string} varName - The alias variable name
 */
function transformToStatusAssertionForIdentifier(path, varName) {
  const callExpr = path.parent.parent.value;
  const arg = callExpr.arguments[0];
  
  // Transform to: varName.getStatus() === arg
  j(path.parent.parent).replaceWith(
    j.binaryExpression(
      '===',
      j.callExpression(
        j.memberExpression(
          j.identifier(varName),
          j.identifier('getStatus')
        ),
        []
      ),
      arg
    )
  );
}

/**
 * Transform container.response.to.have.status() to container.response.getStatus() === arg
 * @param {Object} path - jscodeshift path
 * @param {string} containerName - The container variable name (e.g. tempPm)
 */
function transformToStatusAssertionForNestedProperty(path, containerName) {
  const callExpr = path.parent.parent.value;
  const arg = callExpr.arguments[0];
  
  // Transform to: containerName.response.getStatus() === arg
  j(path.parent.parent).replaceWith(
    j.binaryExpression(
      '===',
      j.callExpression(
        j.memberExpression(
          j.memberExpression(
            j.identifier(containerName),
            j.identifier('response')
          ),
          j.identifier('getStatus')
        ),
        []
      ),
      arg
    )
  );
}

/**
 * Handle Postman's tests["..."] = ... syntax
 * @param {Object} ast - jscodeshift AST
 */
function handleTestsBracketNotation(ast) {
  // Find the ExpressionStatement that contains the assignment
  ast.find(j.ExpressionStatement, {
    expression: {
      type: 'AssignmentExpression',
      left: {
        type: 'MemberExpression',
        object: { name: 'tests' },
        computed: true,
        property: { type: 'Literal' }
      }
    }
  }).forEach(path => {
    // Get the assignment expression
    const assignment = path.value.expression;
    const left = assignment.left;
    
    // Verify the property is a string (same checks as before for safety)
    if (left.object.type === 'Identifier' && 
        left.object.name === 'tests' && 
        left.computed === true &&
        left.property.type === 'Literal' &&
        typeof left.property.value === 'string') {
      
      const testName = left.property.value;
      const rightSide = assignment.right;
      
      // Replace the entire statement instead of just the expression
      j(path).replaceWith(
        j.expressionStatement(
          j.callExpression(
            j.identifier('test'),
            [
              j.literal(testName),
              j.functionExpression(
                null,
                [],
                j.blockStatement([
                  j.expressionStatement(
                    j.memberExpression(
                      j.callExpression(
                        j.identifier('expect'),
                        [
                          j.callExpression(
                            j.identifier('Boolean'),
                            [rightSide]
                          )
                        ]
                      ),
                      j.identifier('to.be.true')
                    )
                  )
                ])
              )
            ]
          )
        )
      );
    }
  });
}

export default translateCode;