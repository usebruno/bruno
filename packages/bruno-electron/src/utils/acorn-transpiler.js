const acorn = require("acorn");
const acornWalk = require("acorn-walk");
const acornLoose = require("acorn-loose");
const NodeType = require("./ast-node-types");
const { SourceType } = require("./ast-constants");

/**
 * Transforms Postman scripts by commenting out unsupported commands
 * that reference the pm or postman objects.
 * 
 * @param {string} code - The source code to transform
 * @return {string} The transformed code with unsupported commands commented out
 */
function transformCode(code) {
  // Split the code into lines for easier manipulation
  const lines = code.split("\n");
  const commentedLines = [...lines];

  // Parse the code into an AST (Abstract Syntax Tree)
  const ast = parseCodeToAst(code);

  // Track variables that are assigned references to pm/postman
  const pmAliases = identifyPmAliases(ast);
  
  // Find all statements that need to be commented out due to direct PM references
  const directStatementsToComment = identifyStatementsToComment(ast, pmAliases);

  // Identify variables that will be commented out
  const commentedOutVars = identifyCommentedOutVars(ast, directStatementsToComment);

  // Find statements that reference these commented-out variables
  const indirectStatementsToComment = identifyStatementsWithCommentedVars(ast, commentedOutVars);

  // Combine direct and indirect statements to comment
  const allStatementsToComment = [...directStatementsToComment, ...indirectStatementsToComment];

  // Merge overlapping statements to comment
  const mergedStatements = mergeOverlappingStatements(allStatementsToComment);

  // Apply comments to the identified statements
  return commentOutStatements(commentedLines, mergedStatements);
}

/**
 * Parses JavaScript code into an Abstract Syntax Tree.
 * Tries multiple parsing strategies for maximum compatibility.
 * 
 * @param {string} code - The source code to parse
 * @return {Object} The resulting AST
 */
function parseCodeToAst(code) {
  try {
    // First attempt: Parse as a module
    return acorn.parse(code, {
      ecmaVersion: "latest",
      sourceType: SourceType.MODULE,
      locations: true,
    });
  } catch (moduleError) {
    try {
      // Second attempt: Parse as a script
      return acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType: SourceType.SCRIPT,
        locations: true,
      });
    } catch (scriptError) {
      // Final attempt: Use Acorn's loose parser for error-tolerant parsing
      console.warn("Standard parsing failed, using acorn-loose parser");
      return acornLoose.parse(code, {
        ecmaVersion: "latest",
        locations: true,
      });
    }
  }
}

/**
 * Identifies all variables that reference the pm/postman objects.
 * We are not considering arrow functions
 * 
 * @param {Object} ast - The AST to analyze
 * @return {Set<string>} Set of variable names that reference pm/postman
 */
function identifyPmAliases(ast) {
  const pmAliases = new Set(["pm", "postman"]);
  const pmTaintedVariables = new Set();
  let hasNewAliases = true;

  // Iterate until no new aliases are found to catch multi-level dependencies
  while (hasNewAliases) {
    const previousSize = pmAliases.size;
    const previousTaintedSize = pmTaintedVariables.size;
    
    // Process all statement types that might contain PM references
    acornWalk.full(ast, (node) => {
      switch (node.type) {
        case NodeType.VariableDeclaration:
          processVariableDeclaration(node, pmAliases, pmTaintedVariables);
          break;
          
        case NodeType.AssignmentExpression:
          processAssignmentExpression(node, pmAliases, pmTaintedVariables);
          break;
          
        case NodeType.FunctionDeclaration:
          processFunctionDeclaration(node, pmAliases, pmTaintedVariables);
          break;
          
        default:
          break;
      }
    });

    // If we didn't find any new aliases or tainted variables, we're done
    hasNewAliases = (pmAliases.size > previousSize) || (pmTaintedVariables.size > previousTaintedSize);
  }

  // Merge tainted variables into aliases for the final result
  for (const tainted of pmTaintedVariables) {
    pmAliases.add(tainted);
  }

  return pmAliases;
}

/**
 * Processes variable declarations to identify PM aliases and tainted variables.
 * 
 * @param {Object} node - The variable declaration node
 * @param {Set<string>} pmAliases - Set of known PM aliases
 * @param {Set<string>} pmTaintedVariables - Set of variables tainted by PM usage
 */
function processVariableDeclaration(node, pmAliases, pmTaintedVariables) {
  for (const declarator of node.declarations) {
    if (!declarator.init) continue;
    
    const init = declarator.init;
    const id = declarator.id;
    
    /**
     * We're only processing simple identifier assignments (e.g., const x = pm) and not patterns.
     * 
     * In JavaScript, "patterns" refer to destructuring assignment structures, such as:
     * 
     * 1. Object destructuring:
     *    const { response, environment } = pm;
     * 
     * 2. Array destructuring:
     *    const [first, second] = pmArray;
     * 
     * 3. Nested destructuring:
     *    const { request: { url, method } } = pm;
     * 
     * 4. Destructuring with aliases:
     *    const { response: pmResponse } = pm;
     * 
     * 5. Rest patterns:
     *    const { response, ...restOfPm } = pm;
     * 
     * Processing patterns would require more complex tracking of partial object 
     * references, maintaining which properties came from which objects, and following
     * nested references through multiple levels.
     * 
     * By focusing only on direct identifier assignments, we keep the analysis simpler
     * and more reliable, at the cost of potentially missing some PM references in
     * destructured code.
     */
    // Only process identifier assignments (not patterns)
    if (id.type !== NodeType.Identifier) continue;
    
    // Direct assignment: const x = pm;
    if (isDirectPmReference(init, pmAliases)) {
      pmAliases.add(id.name);
      continue;
    }
    
    // Assignment from PM member expression: const x = pm.response;
    if (isPmMemberExpression(init, pmAliases)) {
      pmAliases.add(id.name);
      continue;
    }
    

    if (isPmCallExpression(init, pmAliases)) {
      pmAliases.add(id.name);
      continue;
    }
    
    // Assignment from member of tainted variable: const x = tainted.property;
    if (init.type === NodeType.MemberExpression && isIdentifierFromSet(init.object, pmAliases, pmTaintedVariables)) {
      pmTaintedVariables.add(id.name);
    }
  }
}

/**
 * Processes assignment expressions to identify PM aliases and tainted variables.
 * 
 * @param {Object} node - The assignment expression node
 * @param {Set<string>} pmAliases - Set of known PM aliases 
 * @param {Set<string>} pmTaintedVariables - Set of variables tainted by PM usage
 */
function processAssignmentExpression(node, pmAliases, pmTaintedVariables) {
  // Only process identifier assignments (not patterns)
  if (node.left.type !== NodeType.Identifier) return;
  
  const left = node.left;
  const right = node.right;
  
  // Direct assignment: x = pm;
  if (isDirectPmReference(right, pmAliases)) {
    pmAliases.add(left.name);
    return;
  }
  
  // Assignment from PM member expression: x = pm.response;
  if (isPmMemberExpression(right, pmAliases)) {
    pmAliases.add(left.name);
    return;
  }
  
  // Assignment from PM call expression: x = pm.response.json();
  if (isPmCallExpression(right, pmAliases)) {
    pmAliases.add(left.name);
    return;
  }
  
  // Assignment from member of tainted variable: x = tainted.property;
  if (right.type === NodeType.MemberExpression && 
      isIdentifierFromSet(right.object, pmAliases, pmTaintedVariables)) {
    pmTaintedVariables.add(left.name);
  }
}

/**
 * Processes function declarations to identify PM usage in function bodies.
 * 
 * Examples of code this would detect:
 * 
 * 1. Direct PM usage in function body:
 *    function getData() {
 *      return pm.response.json();
 *    }
 * 
 * 2. PM usage in default parameters:
 *    function process(data = pm.variables.get('default')) {
 *      // ...
 *    }
 * 
 * 3. PM usage in nested expressions:
 *    function fetchData() {
 *      const baseUrl = pm.environment.get('baseUrl');
 *      return fetch(baseUrl);
 *    }
 * 
 * @param {Object} node - The function declaration node
 * @param {Set<string>} pmAliases - Set of known PM aliases 
 * @param {Set<string>} pmTaintedVariables - Set of variables tainted by PM usage
 */
function processFunctionDeclaration(node, pmAliases, pmTaintedVariables) {
  // Check for PM usage in function body
  let containsPmReference = false;
  
  // Check function body for PM references
  if (node.body && node.body.type === NodeType.BlockStatement) {
    acornWalk.full(node.body, (bodyNode) => {
      // Check for direct PM reference
      if (isDirectPmReference(bodyNode, pmAliases)) {
        containsPmReference = true;
      }
      
      // Check for PM member expressions
      if (isPmMemberExpression(bodyNode, pmAliases)) {
        containsPmReference = true;
      }
      
      // Check for PM call expressions
      if (isPmCallExpression(bodyNode, pmAliases)) {
        containsPmReference = true;
      }
    });
  }
  
  // Check for PM references in parameter default values
  if (node.params && node.params.length > 0) {
    for (const param of node.params) {
      // If parameter has a default value
      if (param.type === NodeType.AssignmentPattern && param.right) {
        // Check if default value references PM
        if (isDirectPmReference(param.right, pmAliases) || 
            isPmMemberExpression(param.right, pmAliases) || 
            isPmCallExpression(param.right, pmAliases)) {
          containsPmReference = true;
        }
      }
    }
  }
  
  // If function contains PM references and has a name, add it to tainted variables
  if (containsPmReference && node.id && node.id.type === NodeType.Identifier) {
    pmTaintedVariables.add(node.id.name);
  }
}

/**
 * Checks if a node is a direct reference to pm or a known pm alias.
 * 
 * Examples:
 * 
 * 1. Direct PM reference:
 *    pm
 *    postman
 * 
 * 2. Reference to PM aliases:
 *    const myPm = pm;
 *    myPm  // This would be detected as a direct reference
 * 
 * 3. Usage in expressions:
 *    const isPmDefined = !!pm;
 *    if (pm) { ... }
 *    someFunction(pm)
 * 
 * @param {Object} node - The node to check
 * @param {Set<string>} pmAliases - Set of known PM aliases
 * @return {boolean} True if it's a direct PM reference
 */
function isDirectPmReference(node, pmAliases) {
  return node.type === NodeType.Identifier && pmAliases.has(node.name);
}

/**
 * Checks if a node is an identifier that exists in either of the provided sets.
 * 
 * @param {Object} node - The node to check
 * @param {...Set<string>} sets - The sets to check against
 * @return {boolean} True if it's an identifier in any of the sets
 */
function isIdentifierFromSet(node, ...sets) {
  if (node.type !== NodeType.Identifier) return false;
  
  for (const set of sets) {
    if (set.has(node.name)) return true;
  }
  
  return false;
}

/**
 * Checks if a call expression is related to PM.
 * 
 * Examples of code this would detect:
 * 
 * 1. Direct PM function call:
 *    pm()
 * 
 * 2. PM method calls:
 *    pm.environment.get('variable')
 *    pm.response.json()
 *    pm.variables.set('key', 'value')
 * 
 * 3. PM alias calls:
 *    const postmanObj = pm;
 *    postmanObj.sendRequest(options)
 * 
 * @param {Object} node - The call expression node
 * @param {Set<string>} pmAliases - Set of known PM aliases
 * @return {boolean} True if the call is PM-related
 */
function isPmCallExpression(node, pmAliases) {
  if (!node || node.type !== NodeType.CallExpression) return false;
  
  const callee = node.callee;
  
  // Direct PM function call: pm()
  if (callee.type === NodeType.Identifier && pmAliases.has(callee.name)) {
    return true;
  }
  
  // PM method call: pm.response.json()
  if (isPmMemberExpression(callee, pmAliases)) {
    return true;
  }
  
  return false;
}

/**
 * Identifies variables that will be commented out because they are defined
 * in statements that contain PM references.
 * 
 * @param {Object} ast - The AST to analyze
 * @param {Array<Object>} statementsToComment - Statements that will be commented out
 * @return {Set<string>} Set of variable names that will be commented out
 */
function identifyCommentedOutVars(ast, statementsToComment) {
  const commentedVars = new Set();
  
  // Convert statement line ranges to a map for easier lookup
  const commentedLines = new Map();
  for (const stmt of statementsToComment) {
    for (let line = stmt.start; line <= stmt.end; line++) {
      commentedLines.set(line, true);
    }
  }
  
  // Find all variable declarations that will be commented out
  acornWalk.full(ast, (node) => {
    if (node.type === NodeType.VariableDeclaration && node.loc) {
      // Check if this declaration is within a statement that will be commented out
      if (commentedLines.has(node.loc.start.line)) {
        // Add all declared variables to the set
        for (const declarator of node.declarations) {
          if (declarator.id.type === NodeType.Identifier) {
            commentedVars.add(declarator.id.name);
          }
        }
      }
    }
    // Also check for function declarations and object properties
    else if (node.type === NodeType.FunctionDeclaration && node.loc) {
      if (node.id && commentedLines.has(node.loc.start.line)) {
        commentedVars.add(node.id.name);
      }
    }
    // Check for object property method definitions
    else if (node.type === NodeType.Property && node.key && node.value && 
             (node.value.type === NodeType.FunctionExpression || 
              node.value.type === NodeType.ArrowFunctionExpression)) {
      if (node.key.type === NodeType.Identifier && node.loc && 
          commentedLines.has(node.loc.start.line)) {
        // Store object property methods too if they're part of objects being commented
        commentedVars.add(node.key.name);
      }
    }
  });
  
  return commentedVars;
}

/**
 * Identifies statements that reference variables which will be commented out.
 * 
 * @param {Object} ast - The AST to analyze
 * @param {Set<string>} commentedVars - Set of variable names that will be commented out
 * @return {Array<Object>} Array of statement locations that should also be commented out
 */
function identifyStatementsWithCommentedVars(ast, commentedVars) {
  const statementsToComment = [];
  
  if (commentedVars.size === 0) return statementsToComment;
  
  acornWalk.full(ast, (node) => {
    if ((node.type === NodeType.ExpressionStatement || 
         node.type === NodeType.VariableDeclaration ||
         node.type === NodeType.ReturnStatement) && node.loc) {
      
      let referencesCommentedVar = false;
      
      // Check if this statement references any commented out variables
      acornWalk.full(node, (childNode) => {
        if (childNode.type === NodeType.Identifier && 
            commentedVars.has(childNode.name)) {
          referencesCommentedVar = true;
        }
        // Also check for MemberExpression where the object is a commented variable
        else if (childNode.type === NodeType.MemberExpression &&
                 childNode.object.type === NodeType.Identifier &&
                 commentedVars.has(childNode.object.name)) {
          referencesCommentedVar = true;
        }
        // Check for CallExpression where the callee is a commented variable
        else if (childNode.type === NodeType.CallExpression) {
          if (childNode.callee.type === NodeType.Identifier && 
              commentedVars.has(childNode.callee.name)) {
            referencesCommentedVar = true;
          }
          // Check for method calls on commented objects
          else if (childNode.callee.type === NodeType.MemberExpression &&
                   childNode.callee.object.type === NodeType.Identifier &&
                   commentedVars.has(childNode.callee.object.name)) {
            referencesCommentedVar = true;
          }
        }
      });
      
      if (referencesCommentedVar) {
        statementsToComment.push({
          start: node.loc.start.line,
          end: node.loc.end.line
        });
      }
    }
  });
  
  return statementsToComment;
}

/**
 * Identifies statements in the AST that contain references to pm/postman objects.
 * 
 * @param {Object} ast - The AST to analyze
 * @param {Set<string>} pmAliases - Set of variable names that reference pm/postman
 * @return {Array<Object>} Array of statement locations to comment out
 */
function identifyStatementsToComment(ast, pmAliases) {
  const statementsToComment = [];

  acornWalk.full(ast, (node) => {
    // Check for PM references in standard statement types
    if (
      node.type === NodeType.VariableDeclaration ||
      node.type === NodeType.ExpressionStatement ||
      node.type === NodeType.FunctionDeclaration ||
      // Add support for control flow statements
      node.type === NodeType.IfStatement ||
      node.type === NodeType.SwitchStatement ||
      node.type === NodeType.ForStatement ||
      node.type === NodeType.ForInStatement ||
      node.type === NodeType.ForOfStatement ||
      node.type === NodeType.WhileStatement ||
      node.type === NodeType.DoWhileStatement ||
      node.type === NodeType.TryStatement
    ) {
      let hasPmReference = false;

      // Check if this statement contains any pm/postman references or their aliases
      acornWalk.full(node, (childNode) => {
        // Direct identifier references
        if (childNode.type === NodeType.Identifier && pmAliases.has(childNode.name)) {
          hasPmReference = true;
        }

        // Member expressions
        if (
          isPmMemberExpression(childNode, pmAliases)
        ) {
          hasPmReference = true;
        }

        if(isPmCallExpression(childNode, pmAliases)) {
          hasPmReference = true;
        }
      });

      if (hasPmReference && node.loc) {
        statementsToComment.push({
          start: node.loc.start.line,
          end: node.loc.end.line,
        });
      }
    }
  });

  return statementsToComment;
}

/**
 * Checks if a member expression is related to pm/postman objects.
 * 
 * Examples of code this would detect:
 * 
 * 1. Direct PM property access:
 *    pm.environment
 *    pm.response
 *    postman.variables
 * 
 * 2. Nested property access:
 *    pm.response.json
 *    pm.environment.get
 *    postman.variables.has
 * 
 * 3. Property access on PM aliases:
 *    const myPm = pm;
 *    myPm.environment.get
 *    
 * 4. Property access after method calls:
 *    pm.response.json().data
 *    pm.variables.get('obj').property
 * 
 * @param {Object} node - The AST node to check
 * @param {Set<string>} pmAliases - Set of variable names that reference pm/postman
 * @return {boolean} True if the expression is related to pm/postman
 */
function isPmMemberExpression(node, pmAliases) {
  if (!node || node.type !== NodeType.MemberExpression) return false;

  // Check if the object is a direct pm identifier or alias
  if (node.object.type === NodeType.Identifier && pmAliases.has(node.object.name)) {
    return true;
  }

  // Check deeper member expressions like pmx.response.json()
  if (node.object.type === NodeType.MemberExpression) {
    return isPmMemberExpression(node.object, pmAliases);
  }

  // Check for call expressions where the result is pm-related
  if (node.object.type === NodeType.CallExpression) {
    if (node.object.callee.type === NodeType.Identifier && pmAliases.has(node.object.callee.name)) {
      return true;
    }
    if (isPmMemberExpression(node.object.callee, pmAliases)) {
      return true;
    }
  }

  return false;
}

/**
 * Merges overlapping statement ranges to ensure clean commenting.
 * 
 * @param {Array<Object>} statements - Array of statement locations
 * @return {Array<Object>} Array of merged statement locations
 */
function mergeOverlappingStatements(statements) {
  if (statements.length === 0) return [];

  // Sort statements by start line
  statements.sort((a, b) => a.start - b.start);

  const merged = [];
  let current = { ...statements[0] };

  for (let i = 1; i < statements.length; i++) {
    const statement = statements[i];
    
    // If this statement starts before the current one ends, merge them
    if (statement.start <= current.end) {
      current.end = Math.max(current.end, statement.end);
    } else {
      // Otherwise, add the current statement to merged list and start a new one
      merged.push(current);
      current = { ...statement };
    }
  }

  // Add the last statement
  merged.push(current);

  // Sort in reverse order for commenting (to avoid line number issues)
  return merged.sort((a, b) => b.start - a.start);
}

/**
 * Comments out specified statement ranges in the code.
 * 
 * @param {Array<string>} lines - Array of code lines
 * @param {Array<Object>} statements - Array of statement locations to comment
 * @return {string} The code with comments added
 */
function commentOutStatements(lines, statements) {
  for (const stmt of statements) {
    // Adjust for 0-based array indexing
    const startLine = stmt.start - 1;
    const endLine = stmt.end - 1;

    // For single-line statements
    if (startLine === endLine) {
      lines[startLine] = "/* " + lines[startLine] + " */";
    }
    // For multi-line statements
    else {
      lines[startLine] = "/*\n" + lines[startLine];
      lines[endLine] = lines[endLine] + "\n*/";
    }
  }

  return lines.join("\n");
}

module.exports = transformCode;