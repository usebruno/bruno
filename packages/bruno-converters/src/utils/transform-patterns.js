/**
 * This file contains pattern transformations for Postman to Bruno code conversion.
 * Each pattern defines a match function to identify AST nodes and a transform function
 * to convert the matched nodes into Bruno equivalent code.
 */
import { getMemberExpressionString, NodeType } from './acorn-translator';

/**
 * Register all built-in patterns with the provided pattern registry
 * 
 * @param {Object} patternRegistry - The pattern registry to register patterns with
 */
export function registerBuiltinPatterns(patternRegistry) {
  // Register pattern for tests[...] = ... syntax
  patternRegistry.register({
    name: 'tests_assignment',
    match: (node) => {
      return node.type === NodeType.AssignmentExpression &&
             node.left.type === NodeType.MemberExpression &&
             node.left.object.type === NodeType.Identifier &&
             node.left.object.name === 'tests' &&
             node.left.property.type === NodeType.Literal;
    },
    transform: (node) => {
      const testName = node.left.property.value;
      const condition = node.right;
      
      // Create test(...) function call
      return {
        type: NodeType.ExpressionStatement,
        expression: {
          type: NodeType.CallExpression,
          callee: {
            type: NodeType.Identifier,
            name: 'test'
          },
          arguments: [
            {
              type: NodeType.Literal,
              value: testName,
            },
            {
              type: NodeType.FunctionExpression,
              params: [],
              body: {
                type: NodeType.BlockStatement,
                body: [
                  {
                    type: NodeType.ExpressionStatement,
                    expression: {
                      type: NodeType.CallExpression,
                      callee: {
                        type: NodeType.MemberExpression,
                        object: {
                          type: NodeType.CallExpression,
                          callee: {
                            type: NodeType.MemberExpression,
                            object: {
                              type: NodeType.Identifier,
                              name: 'expect'
                            },
                            property: {
                              type: NodeType.CallExpression,
                              callee: {
                                type: NodeType.Identifier,
                                name: 'Boolean'
                              },
                              arguments: [condition]
                            },
                            computed: false
                          },
                          arguments: []
                        },
                        property: {
                          type: NodeType.Identifier,
                          name: 'to'
                        },
                        computed: false
                      },
                      arguments: []
                    }
                  }
                ]
              }
            }
          ]
        }
      };
    }
  });

  // Register pattern for pm.environment.has
  patternRegistry.register({
    name: 'pm_environment_has',
    match: (node) => {
      return node.type === NodeType.CallExpression &&
             node.callee.type === NodeType.MemberExpression &&
             getMemberExpressionString(node.callee) === 'pm.environment.has' &&
             node.arguments.length === 1;
    },
    transform: (node) => {
      // Create bru.getEnvVar(variable) !== undefined && bru.getEnvVar(variable) !== null
      return {
        type: NodeType.BinaryExpression,
        operator: '&&',
        left: {
          type: NodeType.BinaryExpression,
          operator: '!==',
          left: {
            type: NodeType.CallExpression,
            callee: {
              type: NodeType.MemberExpression,
              object: {
                type: NodeType.Identifier,
                name: 'bru'
              },
              property: {
                type: NodeType.Identifier,
                name: 'getEnvVar'
              },
              computed: false
            },
            arguments: [node.arguments[0]]
          },
          right: {
            type: NodeType.Identifier,
            name: 'undefined'
          }
        },
        right: {
          type: NodeType.BinaryExpression,
          operator: '!==',
          left: {
            type: NodeType.CallExpression,
            callee: {
              type: NodeType.MemberExpression,
              object: {
                type: NodeType.Identifier,
                name: 'bru'
              },
              property: {
                type: NodeType.Identifier,
                name: 'getEnvVar'
              },
              computed: false
            },
            arguments: [node.arguments[0]]
          },
          right: {
            type: NodeType.Literal,
            value: null
          }
        }
      };
    }
  });

  // Register pattern for pm.response.json property access
  patternRegistry.register({
    name: 'pm_response_json_property_access',
    match: (node) => {
      return node.type === NodeType.MemberExpression &&
             node.object.type === NodeType.CallExpression &&
             node.object.callee.type === NodeType.MemberExpression &&
             getMemberExpressionString(node.object.callee) === 'pm.response.json';
    },
    transform: (node) => {
      // Create res.getBody()?.property
      const propertyName = node.computed 
        ? node.property.value 
        : node.property.name;
        
      return {
        type: NodeType.ChainExpression,
        expression: {
          type: NodeType.MemberExpression,
          object: {
            type: NodeType.CallExpression,
            callee: {
              type: NodeType.MemberExpression,
              object: {
                type: NodeType.Identifier,
                name: 'res'
              },
              property: {
                type: NodeType.Identifier,
                name: 'getBody'
              },
              computed: false
            },
            arguments: []
          },
          property: {
            type: node.property.type === NodeType.Literal 
              ? NodeType.Literal 
              : NodeType.Identifier,
            name: propertyName,
            value: propertyName,
          },
          computed: node.computed,
          optional: true
        }
      };
    }
  });

  // Register pattern for pm.variables.has
  patternRegistry.register({
    name: 'pm_variables_has',
    match: (node) => {
      return node.type === NodeType.CallExpression &&
             node.callee.type === NodeType.MemberExpression &&
             getMemberExpressionString(node.callee) === 'pm.variables.has' &&
             node.arguments.length === 1;
    },
    transform: (node) => {
      // Create bru.hasVar(variable)
      return {
        type: NodeType.CallExpression,
        callee: {
          type: NodeType.MemberExpression,
          object: {
            type: NodeType.Identifier,
            name: 'bru'
          },
          property: {
            type: NodeType.Identifier,
            name: 'hasVar'
          },
          computed: false
        },
        arguments: [node.arguments[0]]
      };
    }
  });
}

/**
 * Register additional patterns specific to certain use cases
 * This can be used by external modules to add their own patterns
 *  
 * @param {Object} patternRegistry - The pattern registry to register patterns with
 */
export function registerAdditionalPatterns(patternRegistry) {
  // Additional patterns can be registered here or by external modules
  // Example pattern for pm.request.headers.add 
  patternRegistry.register({
    name: 'pm_request_headers_add',
    match: (node) => {
      return node.type === NodeType.CallExpression &&
             node.callee.type === NodeType.MemberExpression &&
             getMemberExpressionString(node.callee) === 'pm.request.headers.add' &&
             node.arguments.length === 1;
    },
    transform: (node) => {
      // Transform to bru.request.addHeader
      return {
        type: NodeType.CallExpression,
        callee: {
          type: NodeType.MemberExpression,
          object: {
            type: NodeType.MemberExpression,
            object: {
              type: NodeType.Identifier,
              name: 'bru'
            },
            property: {
              type: NodeType.Identifier,
              name: 'request'
            },
            computed: false
          },
          property: {
            type: NodeType.Identifier,
            name: 'addHeader'
          },
          computed: false
        },
        arguments: node.arguments
      };
    }
  });
} 