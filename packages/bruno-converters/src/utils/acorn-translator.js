import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import * as acornLoose from 'acorn-loose';
import * as escodegen from 'escodegen';
import NodeType from './ast-node-types';
import SourceType from './ast-constants';

// Translation map without regex escape characters
const translationMap = {
  // Environment variables
  'pm.environment.get': 'bru.getEnvVar',
  'pm.environment.set': 'bru.setEnvVar',
  'pm.environment.has': 'bru.hasEnvVar',
  'pm.environment.name': 'bru.getEnvName()',
  
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
  'pm.response.to.have.status': 'expect(res.getStatus()).to.equal',
  
  // Execution control
  'pm.execution.skipRequest': 'bru.runner.skipRequest',
  'pm.execution.setNextRequest(null)': 'bru.runner.stopExecution()',
  'pm.execution.setNextRequest(\'null\')': 'bru.runner.stopExecution()',
  
  // Legacy Postman API (deprecated)
  'postman.setEnvironmentVariable': 'bru.setEnvVar',
  'postman.getEnvironmentVariable': 'bru.getEnvVar',
  'postman.clearEnvironmentVariable': 'bru.deleteEnvVar',
};

// Pattern Registry for plugin-like functionality
class PatternRegistry {
  constructor() {
    this.patterns = [];
    this.enabled = true;
  }
  
  /**
   * Register a new pattern
   * 
   * @param {Object} pattern - The pattern to register
   * @param {Function} pattern.match - Function that determines if the pattern applies to a node
   * @param {Function} pattern.transform - Function that transforms matching nodes
   * @param {string} pattern.name - Optional name for the pattern
   * @param {boolean} pattern.enabled - Whether the pattern is enabled (default: true)
   * @return {number} Index of the registered pattern
   */
  register(pattern) {
    if (!pattern.match || typeof pattern.match !== 'function') {
      throw new Error('Pattern must include a match function');
    }
    
    if (!pattern.transform || typeof pattern.transform !== 'function') {
      throw new Error('Pattern must include a transform function');
    }
    
    const fullPattern = {
      ...pattern,
      enabled: pattern.enabled !== false, // Enabled by default
      name: pattern.name || `pattern_${this.patterns.length}`
    };
    
    this.patterns.push(fullPattern);
    return this.patterns.length - 1;
  }
  
  
  /**
   * Get all enabled patterns
   * 
   * @return {Array} Array of enabled patterns
   */
  getEnabledPatterns() {
    return this.patterns.filter(pattern => pattern.enabled);
  }
}

// Create a singleton pattern registry
const patternRegistry = new PatternRegistry();

// Import patterns from the separate patterns file
import { registerBuiltinPatterns } from './transform-patterns';

// Register the built-in patterns
registerBuiltinPatterns(patternRegistry);

/**
 * Checks if a node represents a member expression chain
 * and returns it as a dotted string (e.g. "pm.response.json").
 *
 * @param {Object} node - The AST node to check
 * @return {string|null} The dotted string or null if not a member expression
 */
function getMemberExpressionString(node) {
  if (node.type !== NodeType.MemberExpression) {
    return null;
  }

  // For computed properties like obj['prop'], we can only translate if it's a literal
  if (node.computed && node.property.type !== NodeType.Literal) {
    return null;
  }

  const propertyName = node.computed 
    ? node.property.value.toString() 
    : node.property.name;

  if (node.object.type === NodeType.Identifier) {
    return `${node.object.name}.${propertyName}`;
  } else if (node.object.type === NodeType.MemberExpression) {
    const objectString = getMemberExpressionString(node.object);
    if (objectString) {
      return `${objectString}.${propertyName}`;
    }
  }

  return null;
}

/**
 * Checks if a call expression matches a translation pattern
 * and returns the matching pattern key.
 * 
 * @param {Object} node - The call expression node
 * @return {string|null} The matching pattern key or null if no match
 */
function getCallExpressionMatch(node) {
  if (node.type !== NodeType.CallExpression) {
    return null;
  }

  // Handle object method calls like pm.response.json()
  if (node.callee.type === NodeType.MemberExpression) {
    const memberString = getMemberExpressionString(node.callee);
    if (memberString && translationMap[memberString]) {
      return memberString;
    }
  }

  // Handle specific method calls with specific arguments
  // Like pm.execution.setNextRequest(null)
  if (node.callee.type === NodeType.MemberExpression) {
    const memberString = getMemberExpressionString(node.callee);
    
    // Handle null argument special cases
    if (memberString === 'pm.execution.setNextRequest' || 
        memberString === 'postman.execution.setNextRequest') {
      if (node.arguments.length === 1) {
        if ((node.arguments[0].type === NodeType.Literal && node.arguments[0].value === null) ||
            (node.arguments[0].type === NodeType.Literal && node.arguments[0].value === 'null')) {
          return `${memberString}(null)`;
        }
      }
    }
  }

  return null;
}

/**
 * Parses a string into an AST expression using acorn's parseExpressionAt.
 * 
 * @param {string} expressionStr - The expression string to parse
 * @return {Object|null} The resulting AST node or null if parsing fails
 */
function parseExpression(expressionStr) {
  try {
    // Use acorn's parseExpressionAt to parse a single expression
    return acorn.parseExpressionAt(expressionStr, 0, {
      ecmaVersion: 'latest',
    });
  } catch (error) {
    console.warn(`Failed to parse expression: ${expressionStr}`, error);
    return null;
  }
}

/**
 * Transforms Postman scripts by converting pm/postman commands to Bruno equivalents.
 * 
 * @param {string} code - The source code to transform
 * @param {Object} options - Options for the transformation
 * @param {boolean} options.enableAllPatterns - Whether to enable all registered patterns
 * @param {Array<string|number>} options.enabledPatterns - Specific patterns to enable
 * @param {Array<string|number>} options.disabledPatterns - Specific patterns to disable
 * @return {string} The transformed code with pm/postman commands translated to Bruno
 */
function translateCode(code, options = {}) {
  if (!code || code.trim() === '') {
    return code;
  }
  
  try {
    // Parse the code into an AST
    let ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      locations: true
    });
    
    // If parsing fails, try again with module type
    if (!ast) {
      try {
        ast = acorn.parse(code, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          locations: true
        });
      } catch (moduleError) {
        // Try loose parsing as a last resort
        try {
          ast = acornLoose.parse(code, {
            ecmaVersion: 'latest',
            locations: true
          });
        } catch (looseError) {
          console.warn('Failed to parse code into AST');
          return code;
        }
      }
    }
    
    if (!ast) {
      console.warn('Failed to parse code into AST');
      return code;
    }
    
    // Track translations for debugging
    const translations = [];
    
    // First pass: Apply special pattern replacements everywhere in the AST
    const nodesToReplace = [];
    
    // Track nodes that have already been processed
    const processedNodes = new WeakSet();
    
    acornWalk.full(ast, (node) => {
      // Skip nodes we've already processed
      if (processedNodes.has(node)) {
        return;
      }
      
      // Check special patterns from the registry
      const enabledPatterns = patternRegistry.getEnabledPatterns();
      for (const pattern of enabledPatterns) {
        if (pattern.match(node)) {
          try {
            const replacement = pattern.transform(node);
            if (replacement) {
              nodesToReplace.push({ node, replacement });
              processedNodes.add(node);
              break;
            }
          } catch (error) {
            console.warn(`Error applying pattern ${pattern.name}:`, error);
          }
        }
      }
    });
    
    // Apply replacements
    nodesToReplace.forEach(({ node, replacement }) => {
      Object.keys(replacement).forEach(key => {
        if (key !== 'start' && key !== 'end' && key !== 'loc') {
          node[key] = replacement[key];
        }
      });
      translations.push('Applied special pattern replacement');
    });
    
    // Second pass: Handle member expressions and call expressions
    acornWalk.simple(ast, {
      // Handle member expressions like pm.response.json
      MemberExpression(node) {
        // Skip nodes we've already processed
        if (processedNodes.has(node)) {
          return;
        }
        
        const memberString = getMemberExpressionString(node);
        if (memberString && translationMap[memberString]) {
          // Check if it's a direct replacement (not a function call)
          // For example: pm.response.code -> res.getStatus()
          if (!memberString.endsWith(')')) {
            const replacement = translationMap[memberString];
            translations.push(`${memberString} -> ${replacement}`);
            try {
              // Don't try to preserve comments in replacement operations
              // Just do the straightforward AST node replacement
              const replacementAst = parseExpression(replacement);
              if (replacementAst) {
                Object.keys(replacementAst).forEach(key => {
                  if (key !== 'start' && key !== 'end' && key !== 'loc') {
                    node[key] = replacementAst[key];
                  }
                });
              }
              processedNodes.add(node);
            } catch (error) {
              console.warn(`Failed to replace member expression (${memberString}): ${error.message}`);
            }
          }
        }
      },
      
      // Handle call expressions like pm.response.json()
      CallExpression(node) {
        // Skip nodes we've already processed
        if (processedNodes.has(node)) {
          return;
        }
        
        const callMatch = getCallExpressionMatch(node);
        if (callMatch && translationMap[callMatch]) {
          const replacement = translationMap[callMatch];
          translations.push(`${callMatch}() -> ${replacement}()`);
          try {
            // If the replacement ends with (), it's a direct function call
            // and we only need to replace the callee
            if (replacement.endsWith('()')) {
              const calleeName = replacement.substring(0, replacement.length - 2);
              const calleeAst = parseExpression(calleeName);
              
              if (calleeAst) {
                // Keep the original arguments
                const originalArgs = [...node.arguments];
                node.callee = calleeAst;
                // Restore arguments to ensure they're preserved
                node.arguments = originalArgs;
              }
            } else {
              // Standard function name replacement
              const calleeAst = parseExpression(replacement);
              
              if (calleeAst) {
                // Keep the original arguments
                const originalArgs = [...node.arguments];
                node.callee = calleeAst;
                // Restore arguments to ensure they're preserved
                node.arguments = originalArgs;
              }
            }
            processedNodes.add(node);
          } catch (error) {
            console.warn(`Failed to replace call expression (${callMatch}): ${error.message}`);
          }
        }
      },
    });
    
    // Generate code from the transformed AST
    let translatedCode = escodegen.generate(ast, {
      format: {
        indent: {
          style: '  ',
          base: 0
        },
        preserveBlankLines: true
      }
    });
    
    // Print translation summary if there were any translations
    if (translations.length > 0) {
      console.log(`Made ${translations.length} translations:`, translations);
    }
    
    return translatedCode;
  } catch (error) {
    console.error('Error in translateCode:', error);
    return code; // Return original code on error
  }
}

// Export the helper functions to be used in patterns
export {
  getMemberExpressionString,
  NodeType
};

// Export the pattern registry to allow plugins to register patterns
export { patternRegistry };

export default translateCode; 