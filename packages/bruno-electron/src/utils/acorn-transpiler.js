const acorn = require("acorn");
const acornWalk = require("acorn-walk");
const acornLoose = require("acorn-loose");

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
  
  // Find all statements that need to be commented out
  const statementsToComment = identifyStatementsToComment(ast, pmAliases);

  // If no statements were found with AST, try a direct string search as fallback
  if (statementsToComment.length === 0) {
    const regexMatches = findPmReferencesWithRegex(lines, pmAliases);
    statementsToComment.push(...regexMatches);
  }

  // Merge overlapping statements to comment
  const mergedStatements = mergeOverlappingStatements(statementsToComment);

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
      sourceType: "module",
      locations: true,
    });
  } catch (moduleError) {
    try {
      // Second attempt: Parse as a script
      return acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType: "script",
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
 * 
 * @param {Object} ast - The AST to analyze
 * @return {Set<string>} Set of variable names that reference pm/postman
 */
function identifyPmAliases(ast) {
  const pmAliases = new Set(["pm", "postman"]);

  acornWalk.full(ast, (node) => {
    // Look for variable declarations like "const pmx = pm"
    if (node.type === "VariableDeclaration") {
      for (const declarator of node.declarations) {
        if (
          declarator.init &&
          ((declarator.init.type === "Identifier" &&
            pmAliases.has(declarator.init.name)) ||
            (declarator.init.type === "MemberExpression" &&
              isPmMemberExpression(declarator.init, pmAliases)))
        ) {
          if (declarator.id.type === "Identifier") {
            pmAliases.add(declarator.id.name);
          }
        }
      }
    }

    // Look for assignments like "pmx = pm"
    if (node.type === "AssignmentExpression") {
      if (
        (node.right.type === "Identifier" && pmAliases.has(node.right.name)) ||
        (node.right.type === "MemberExpression" &&
          isPmMemberExpression(node.right, pmAliases))
      ) {
        if (node.left.type === "Identifier") {
          pmAliases.add(node.left.name);
        }
      }
    }
  });

  return pmAliases;
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
    if (
      node.type === "VariableDeclaration" ||
      node.type === "ExpressionStatement"
    ) {
      let hasPmReference = false;

      // Check if this statement contains any pm/postman references or their aliases
      acornWalk.full(node, (childNode) => {
        // Direct identifier references
        if (childNode.type === "Identifier" && pmAliases.has(childNode.name)) {
          hasPmReference = true;
        }

        // Member expressions
        if (
          childNode.type === "MemberExpression" &&
          isPmMemberExpression(childNode, pmAliases)
        ) {
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
 * @param {Object} node - The AST node to check
 * @param {Set<string>} pmAliases - Set of variable names that reference pm/postman
 * @return {boolean} True if the expression is related to pm/postman
 */
function isPmMemberExpression(node, pmAliases) {
  if (!node || node.type !== "MemberExpression") return false;

  // Check if the object is a direct pm identifier
  if (node.object.type === "Identifier" && pmAliases.has(node.object.name)) {
    return true;
  }

  // Check deeper member expressions like pmx.response.json()
  if (node.object.type === "MemberExpression") {
    return isPmMemberExpression(node.object, pmAliases);
  }

  return false;
}

/**
 * Fallback method to find pm/postman references using regex.
 * 
 * @param {Array<string>} lines - Array of code lines
 * @param {Set<string>} pmAliases - Set of variable names that reference pm/postman
 * @return {Array<Object>} Array of line ranges containing pm/postman references
 */
function findPmReferencesWithRegex(lines, pmAliases) {
  const matches = [];

  // Create a regex pattern with all the aliases
  const aliasPattern = Array.from(pmAliases)
    .map((alias) => `\\b${alias}\\b`)
    .join("|");
  const pmRegex = new RegExp(`(${aliasPattern})`);

  lines.forEach((line, index) => {
    if (line.match(pmRegex)) {
      matches.push({
        start: index + 1,
        end: index + 1,
      });
    }
  });

  return matches;
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