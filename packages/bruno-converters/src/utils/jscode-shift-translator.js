import sendRequestTransformer from './send-request-transformer';
const j = require('jscodeshift');
const cloneDeep = require('lodash/cloneDeep');

/**
 * Efficiently builds a string representation of a member expression without using toSource()
 * 
 * @param {Object} node - The member expression node from the AST
 * @return {string} - String representation of the member expression (e.g., "pm.environment.get")
 */
function getMemberExpressionString(node) {
  // Handle base case: if this is an Identifier
  if (node.type === 'Identifier') {
    return node.name;
  }
  
  // Handle member expressions
  if (node.type === 'MemberExpression') {
    const objectStr = getMemberExpressionString(node.object);
    
    // For computed properties like obj[prop], we need special handling
    if (node.computed) {
      // For literals like obj["prop"], we can include them in the string
      if (node.property.type === 'Literal' && typeof node.property.value === 'string') {
        return `${objectStr}.${node.property.value}`;
      }
      // For other computed properties, we can't reliably represent them as a simple string
      return `${objectStr}.[computed]`;
    }
    
    // For regular property access like obj.prop
    if (node.property.type === 'Identifier') {
      return `${objectStr}.${node.property.name}`;
    }
  }
  
  return '[unsupported]';
}

// Simple 1:1 translations for straightforward replacements
const simpleTranslations = {
  // Global Variables
  'pm.globals.get': 'bru.getGlobalEnvVar',
  'pm.globals.set': 'bru.setGlobalEnvVar',
  
  // Environment variables
  'pm.environment.get': 'bru.getEnvVar',
  'pm.environment.set': 'bru.setEnvVar',
  'pm.environment.name': 'bru.getEnvName()',
  'pm.environment.unset': 'bru.deleteEnvVar',
  
  // Variables
  'pm.variables.get': 'bru.getVar',
  'pm.variables.set': 'bru.setVar',
  'pm.variables.has': 'bru.hasVar',
  'pm.variables.replaceIn': 'bru.interpolate',
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

  // Info
  'pm.info.requestName': 'req.getName()',

  // Request properties
  'pm.request.url': 'req.getUrl()',
  'pm.request.method': 'req.getMethod()',
  'pm.request.headers': 'req.getHeaders()',
  'pm.request.body': 'req.getBody()',
 
  // Response properties
  'pm.response.json': 'res.getBody',
  'pm.response.code': 'res.getStatus()',
  'pm.response.status': 'res.statusText',
  'pm.response.responseTime': 'res.getResponseTime()',
  'pm.response.statusText': 'res.statusText',
  'pm.response.headers': 'res.getHeaders()',
  
  // Execution control
  'pm.execution.skipRequest': 'bru.runner.skipRequest',
  
  // Legacy Postman API (deprecated) (we can use pm instead of postman, as we are converting all postman references to pm in the code as the part of pre-processing)
  'pm.setEnvironmentVariable': 'bru.setEnvVar',
  'pm.getEnvironmentVariable': 'bru.getEnvVar',
  'pm.clearEnvironmentVariable': 'bru.deleteEnvVar',
};

/* Complex transformations that need custom handling
* Note: Transform functions can return either a single node or an array of nodes.
* When returning an array of nodes, each node in the array will be inserted
* as a separate statement, which allows a single Postman expression to be
* transformed into multiple Bruno statements (e.g. for complex assertions).
*/

const complexTransformations = [
  // pm.sendRequest transformation
  {
    pattern: 'pm.sendRequest',
    transform: sendRequestTransformer
  },
  
  // pm.environment.has requires special handling
 {
    pattern: 'pm.environment.has',
    transform: (path, j) => {
      const callExpr = path.parent.value;
      
      const args = callExpr.arguments;
      
      // Create: bru.getEnvVar(arg) !== undefined && bru.getEnvVar(arg) !== null
      return j.logicalExpression(
        '&&',
        j.binaryExpression(
          '!==',
          j.callExpression(j.identifier('bru.getEnvVar'), args),
          j.identifier('undefined')
        ),
        j.binaryExpression(
          '!==',
          j.callExpression(j.identifier('bru.getEnvVar'), args),
          j.identifier('null')
        )
      );
    }
  },

  {
    pattern: 'pm.response.text',
    transform: (_, j) => {
      return j.callExpression(j.identifier('JSON.stringify'), [j.identifier('res.getBody()')]);
    }
  },
  {
    pattern: 'pm.response.headers.get',
    transform: (path, j) => {
      return j.callExpression(j.identifier('res.getHeader'), path.parent.value.arguments);
    }
  },
  // Handle pm.response.to.have.status
  {
    pattern: 'pm.response.to.have.status',
    transform: (path, j) => {
      const callExpr = path.parent.value;
      
      const args = callExpr.arguments;
      
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
        args
      );
    }
  },

  // handle 'pm.response.to.have.header' to expect(res.getHeaders()).to.have.property(args)
  {
    pattern: 'pm.response.to.have.header',
    transform: (path, j) => {
      const callExpr = path.parent.value;
  
      const args = callExpr.arguments;
      

      if (args.length > 0) {
        // Apply toLowerCase() to the first argument
        args[0] = j.callExpression(
          j.memberExpression(
            args[0],
            j.identifier('toLowerCase')
          ),
          []
        );
      }

      // Create: expect(res.getHeaders()).to.have.property(args)
      return j.callExpression(
        j.memberExpression(
          j.callExpression(
            j.identifier('expect'),
            [
              j.callExpression(
                j.identifier('res.getHeaders'),
                []
              )
            ]
          ),
          j.identifier('to.have.property')
        ),
        args
      );
          
    }
  },
 // handle pm.response.to.have.body to expect(res.getBody()).to.equal(arg)
  {
    pattern: 'pm.response.to.have.body',
    transform: (path, j) => {
      const callExpr = path.parent.value;
      
      const args = callExpr.arguments;

      return j.callExpression(
        j.memberExpression(
          j.callExpression(j.identifier('expect'), [j.identifier('res.getBody()')]),
          j.identifier('to.equal')
        ),
        args
      );
      
    }
  },

  // Handle pm.execution.setNextRequest(null)
  {
    pattern: 'pm.execution.setNextRequest',
    transform: (path, j) => {
      const callExpr = path.parent.value;
      
      const args = callExpr.arguments;
      
      // If argument is null or 'null', transform to bru.runner.stopExecution()
      if (
        args[0].type === 'Literal' && (args[0].value === null || args[0].value === 'null')
      ) {
        return j.callExpression(
          j.identifier('bru.runner.stopExecution'),
          []
        );
      }
      
      // Otherwise, keep as bru.runner.setNextRequest with the same argument
      return j.callExpression(
        j.identifier('bru.runner.setNextRequest'),
        args
      );
    }
  }, 
];

// Create a map for complex transformations to enable O(1) lookups
const complexTransformationsMap = {};
complexTransformations.forEach(transform => {
  complexTransformationsMap[transform.pattern] = transform;
});

const varInitsToReplace = new Set(['pm', 'postman', 'pm.request','pm.response', 'pm.test', 'pm.expect', 'pm.environment', 'pm.variables', 'pm.collectionVariables', 'pm.execution', 'pm.globals']);

/**
 * Process all transformations (both simple and complex) in the AST in a single pass
 * @param {Object} ast - jscodeshift AST
 * @param {Set} transformedNodes - Set of already transformed nodes
 */
function processTransformations(ast, transformedNodes) {
  ast.find(j.MemberExpression).forEach(path => {
    if (transformedNodes.has(path.node)) return;
    
    // Get string representation using our utility function
    const memberExprStr = getMemberExpressionString(path.value);
    
    // First check for simple transformations (O(1))
    if (simpleTranslations.hasOwnProperty(memberExprStr)) {
      const replacement = simpleTranslations[memberExprStr];
      j(path).replaceWith(j.identifier(replacement));
      transformedNodes.add(path.node);
      return; // Skip complex transformation check if simple transformation applied
    }
    
    // Then check for complex transformations (O(1))
    if (complexTransformationsMap.hasOwnProperty(memberExprStr) && 
        path.parent.value.type === 'CallExpression') {
      const transform = complexTransformationsMap[memberExprStr];
      const replacement = transform.transform(path, j);
      if (Array.isArray(replacement)) {
        replacement.forEach((nodePath, index) => {
          if(index === 0) {
            j(path.parent).replaceWith(nodePath);
          } else {
            j(path.parent.parent).insertAfter(nodePath);
          }
          transformedNodes.add(nodePath.node);
          transformedNodes.add(path.parent.node);
        });
      } else {
        j(path.parent).replaceWith(replacement);
        transformedNodes.add(path.node);
        transformedNodes.add(path.parent.node);
      }
    }
  });
}

/**
 * Translates Postman script code to Bruno script code
 * @param {string} code - The Postman script code to translate
 * @returns {string} The translated Bruno script code
 */
function translateCode(code) {
  // Replace 'postman' with 'pm' using regex before creating the AST
  // This is more efficient than an AST traversal
  code = code.replace(/\bpostman\b/g, 'pm');
  
  const ast = j(code);
  
  // Keep track of transformed nodes to avoid double-processing
  const transformedNodes = new Set();

  // Preprocess the code to resolve all aliases
  preprocessAliases(ast);

  // Process all transformations in a single pass
  processTransformations(ast, transformedNodes);
  
  // Handle special Postman syntax patterns
  handleTestsBracketNotation(ast);
  
  return ast.toSource();
}

/**
 * Preprocess all variable aliases in the AST to simplify later transformations
 * @param {Object} ast - jscodeshift AST
 */
function preprocessAliases(ast) {
  // Create a symbol table to track what each variable references
  const symbolTable = new Map();
  const MAX_ITERATIONS = 5;
  let iterations = 0;
  
  // Keep preprocessing until no more changes can be made
  let changesMade;
  do {
    changesMade = false;
    
    // First pass: Identify all variables
    findVariableDefinitions(ast, symbolTable);
    
    // Second pass: Replace all variable references with their resolved values
    changesMade = resolveVariableReferences(ast, symbolTable) || false;
    
    // Third pass: Clean up variable declarations that are no longer needed
    changesMade = removeResolvedDeclarations(ast, symbolTable) || false;

    iterations++;
    
  } while (changesMade && iterations < MAX_ITERATIONS);
}

/**
 * Find all variable definitions and track what they reference
 * @param {Object} ast - jscodeshift AST
 * @param {Map} symbolTable - Map to track variable references
 */
function findVariableDefinitions(ast, symbolTable) {
  // Use a single traversal to handle both direct assignments and object destructuring
  ast.find(j.VariableDeclarator).forEach(path => {
    // Only process nodes that have an initializer
    if (!path.value.init) return;

    // Handle direct assignments: const response = pm.response
    if (path.value.id.type === 'Identifier') {
      const varName = path.value.id.name;
      
      // If it's a direct identifier, just map it
      if (path.value.init.type === 'Identifier') {
        symbolTable.set(varName, { 
          type: 'identifier',
          value: path.value.init.name
        });
      }
      // If it's a member expression, store both parts
      else if (path.value.init.type === 'MemberExpression') {
        const sourceCode = getMemberExpressionString(path.value.init);
        symbolTable.set(varName, {
          type: 'memberExpression',
          value: sourceCode,
          node: path.value.init
        });
      }
    }
    // Handle object destructuring: const { response } = pm
    else if (path.value.id.type === 'ObjectPattern' && path.value.init.type === 'Identifier') {
      const source = path.value.init.name;
      
      path.value.id.properties.forEach(prop => {
        if (prop.key.name && prop.value.type === 'Identifier') {
          const destVarName = prop.value.name;
          symbolTable.set(destVarName, {
            type: 'memberExpression',
            value: `${source}.${prop.key.name}`,
            node: j.memberExpression(
              j.identifier(source),
              j.identifier(prop.key.name)
            )
          });
        }
      });
    }
  });
}

/**
 * Resolve variable references by replacing them with their original values
 * @param {Object} ast - jscodeshift AST
 * @param {Map} symbolTable - Map of variable references
 * @returns {boolean} Whether any changes were made
 */
function resolveVariableReferences(ast, symbolTable) {
  let changesMade = false;
  
  /**
   * Example of what this function does:
   * 
   * Input Postman code:
   *   const response = pm.response;
   *   const jsonData = response.json();  // response is a reference to pm.response
   * 
   * After resolution:
   *   const response = pm.response;
   *   const jsonData = pm.response.json();  // response reference is replaced with pm.response
   * 
   * Then in the next preprocessing phase, unnecessary variables like 'response' will be removed.
   */
  
  // Replace all identifier references with their resolved values
  ast.find(j.Identifier).forEach(path => {
    const varName = path.value.name;
    
    /**
     * Skip specific types of identifiers that shouldn't be replaced:
     * 
     * Case 1: Variable definitions (left side of declarations)
     * -----------------------------------------------------
     * In code like:
     *   const response = pm.response;
     *           ^
     * We shouldn't replace 'response' on the left side with pm.response,
     * which would result in: const pm.response = pm.response; (invalid syntax)
     * 
     * Case 2: Property names in member expressions
     * -----------------------------------------------------
     * In code like:
     *   console.log(response.status);
     *                       ^
     * We shouldn't replace the 'status' property name with anything,
     * only the 'response' object reference should be replaced.
     * 
     * We only want to replace identifiers that are being used as references,
     * not the ones being defined or used as property names.
     */
    
    // Skip if this is a variable definition or property name
    if (path.parent.value.type === 'VariableDeclarator' && path.parent.value.id === path.value) {
      return;
    }
    if (path.parent.value.type === 'MemberExpression' && path.parent.value.property === path.value && !path.parent.value.computed) {
      return;
    }
    
    // Only replace if this is a known variable
    if (!symbolTable.has(varName)) return;

    const symbolInfo = symbolTable.get(varName);
    if(!varInitsToReplace.has(symbolInfo.value)) {
      return;
    }
    const newNode = cloneDeep(symbolInfo.node);
    j(path).replaceWith(newNode);
    symbolTable.set(varName, {
      type: 'memberExpression',
      value: symbolInfo.value,
      node: newNode
    });
    changesMade = true; 
    
  });
  
  return changesMade;
}

/**
 * Remove variable declarations that have been resolved
 * @param {Object} ast - jscodeshift AST
 * @param {Map} symbolTable - Map of variable references
 * @returns {boolean} Whether any changes were made
 */
function removeResolvedDeclarations(ast, symbolTable) {  
  let changesMade = false;
  
  /**
   * Example of what this function does:
   * 
   * Original Postman code:
   *   const response = pm.response;
   *   const jsonData = response.json();
   *   console.log(jsonData.name);
   * 
   * After variable resolution:
   *   const response = pm.response;        // This declaration is now redundant
   *   const jsonData = pm.response.json(); // This value has been resolved
   *   console.log(jsonData.name);          // This still references jsonData
   * 
   * Final code after this cleanup step:
   *   const jsonData = pm.response.json(); // response variable declaration is removed
   *   console.log(jsonData.name);          // jsonData is kept since it's still referenced
   * 
   * We only remove declarations that:
   * 1. Have been fully resolved (references to pm.* objects)
   * 2. No longer provide any value (since all references were replaced with resolved values)
   */
  
  // Use a single traversal to handle both regular variable declarations and destructuring
  ast.find(j.VariableDeclarator).forEach(path => {
    // Case 1: Handle regular variable declarations
    if (path.value.id.type === 'Identifier') {
      const varName = path.value.id.name;
      const replacement = symbolTable.get(varName);
      if(!replacement || !varInitsToReplace.has(replacement.value)) return;
     
      /**
       * This code differentiates between two types of variable declarations:
       * 
       * Example 1: Single variable declaration
       * -----------------------------------
       * Input:   const response = pm.response;
       * Action:  The entire statement can be removed
       * Output:  [statement removed]
       * 
       * Example 2: Multiple variables in one declaration
       * -----------------------------------
       * Input:   const response = pm.response, unrelated = 5;
       * Action:  Only remove the 'response' declarator, keep the others
       * Output:  const unrelated = 5;
       * 
       * We need this distinction to ensure we don't accidentally remove
       * unrelated variables that happen to be declared in the same statement.
       */
      const declarationPath = j(path).closest(j.VariableDeclaration);
      if (declarationPath.get().value.declarations.length === 1) {
        declarationPath.remove();
      } else {
        // Otherwise just remove this declarator
        j(path).remove();
      }
      
      changesMade = true;
    }
    // Case 2: Handle destructuring of pm
    else if (path.value.id.type === 'ObjectPattern' && 
             path.value.init && 
             path.value.init.type === 'Identifier' && 
             path.value.init.name === 'pm') {
      
      /**
       * Example of destructuring removal:
       * 
       * Original Postman code:
       *   const { response, environment } = pm;
       *   console.log(response.json().name);
       *   console.log(environment.get("variable"));
       * 
       * After variable resolution steps:
       *   const { response, environment } = pm;  // This destructuring is now redundant
       *   console.log(pm.response.json().name); // 'response' references already replaced with pm.response
       *   console.log(pm.environment.get("variable")); // 'environment' references replaced
       * 
       * Final code after this cleanup step:
       *   console.log(pm.response.json().name); // Destructuring declaration is completely removed
       *   console.log(pm.environment.get("variable"));
       * 
       * This step specifically targets the Postman pattern of destructuring the pm object,
       * which is common in Postman scripts but needs to be removed in the Bruno conversion.
       */
      
      const declarationPath = j(path).closest(j.VariableDeclaration);
      if (declarationPath.get().value.declarations.length === 1) {
        declarationPath.remove();
      } else {
        j(path).remove();
      }
      
      changesMade = true;
    }
  });
  
  return changesMade;
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
        property: {} // Accept any property type
      }
    }
  }).forEach(path => {
    // Get the assignment expression
    const assignment = path.value.expression;
    const left = assignment.left;
    
    // Verify it's a valid tests[] expression
    if (left.object.type === 'Identifier' && 
        left.object.name === 'tests' && 
        left.computed === true) {
      
      const property = left.property;
      const rightSide = assignment.right;
      
      // Handle string literals
      if (property.type === 'Literal' && typeof property.value === 'string') {
        const testName = property.value;
        
        // Replace with test() function call
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
      // Handle template literals
      else if (property.type === 'TemplateLiteral') {
        // Create a template literal with the same quasi and expressions
        const templateLiteral = j.templateLiteral(
          property.quasis,
          property.expressions
        );
        
        // Replace with test() function call using template literal
        j(path).replaceWith(
          j.expressionStatement(
            j.callExpression(
              j.identifier('test'),
              [
                templateLiteral,
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
    }
  });
}

export { getMemberExpressionString };
export default translateCode; 