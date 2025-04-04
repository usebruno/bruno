const parser = require("@babel/parser");
const traverse = require("@babel/traverse");
const t = require("@babel/types");

/* check deps
* @babel/parser - No shady deps - unpacked 1.92 MB
* - @babel/types
****************
* @babel/types - No shady deps - unpacked 2.58 MB
* - @babel/helper-string-parser
* - @babel/helper-validator-identifier
****************
* @babel/traverse - No shady deps - unpacked 677 kB
* - @babel/code-frame
* - @babel/generator
* - @babel/parser
* - @babel/template
* - @babel/types
* - debug
* - globals
*/

// bundle size
// perf benchmark; 1000 iterations of this code takes around 700ms

// Function to comment out unsupported commands
function transformCode(code) {
  // First, split the code into lines for easier manipulation
  const lines = code.split("\n");
  const commentedLines = [...lines];

  // Parse the code to find pm/postman expressions
  const ast = parser.parse(code, { sourceType: "unambiguous", plugins: [] });

  // Track statements that need to be commented out
  const pmStatements = [];

  // Find all statements that reference pm/postman
  traverse.default(ast, {
    // Handle variable declarations like 'const data = pm.response.json()'
    VariableDeclaration(path) {
      let hasPm = false;

      // Check each declarator
      path.traverse({
        MemberExpression(memberPath) {
          if (isPmNode(memberPath.node)) {
            hasPm = true;
            memberPath.stop();
          }
        },
      });

      if (hasPm) {
        const loc = path.node.loc;
        if (loc) {
          pmStatements.push({
            start: loc.start.line,
            end: loc.end.line,
          });
        }
      }
    },

    // Handle all expression statements
    ExpressionStatement(path) {
      let hasPm = false;

      path.traverse({
        MemberExpression(memberPath) {
          if (isPmNode(memberPath.node)) {
            hasPm = true;
            memberPath.stop();
          }
        },
      });

      if (hasPm) {
        const loc = path.node.loc;
        if (loc) {
          pmStatements.push({
            start: loc.start.line,
            end: loc.end.line,
          });
        }
      }
    },
  });

  // Helper function to check if a node is a pm/postman reference or contains one
  function isPmNode(node) {
    // Direct pm/postman identifier
    if (t.isIdentifier(node) && /^(pm|postman)$/.test(node.name)) {
      return true;
    }

    // Check for pm.something
    if (t.isMemberExpression(node)) {
      // pm.something
      if (
        t.isIdentifier(node.object) &&
        /^(pm|postman)$/.test(node.object.name)
      ) {
        return true;
      }

      // Also check if the object itself is a member expression that might contain pm
      // This handles pm.response.json()
      if (t.isMemberExpression(node.object)) {
        return isPmNode(node.object);
      }
    }

    return false;
  }

  // Merge overlapping statements
  pmStatements.sort((a, b) => a.start - b.start);

  const mergedStatements = [];
  let currentStmt = null;

  for (const stmt of pmStatements) {
    if (!currentStmt) {
      currentStmt = { ...stmt };
    } else {
      // If this statement starts before the current one ends, merge them
      if (stmt.start <= currentStmt.end) {
        currentStmt.end = Math.max(currentStmt.end, stmt.end);
      } else {
        // Otherwise, add the current statement to merged list and start a new one
        mergedStatements.push(currentStmt);
        currentStmt = { ...stmt };
      }
    }
  }

  // Add the last statement if there is one
  if (currentStmt) {
    mergedStatements.push(currentStmt);
  }

  // Sort in reverse order to avoid messing up line numbers when adding comments
  mergedStatements.sort((a, b) => b.start - a.start);

  // Comment out the statements
  for (const stmt of mergedStatements) {
    // Adjust for 0-based array indexing
    const startLine = stmt.start - 1;
    const endLine = stmt.end - 1;

    // For single-line statements
    if (startLine === endLine) {
      commentedLines[startLine] = "/* " + commentedLines[startLine] + " */";
    }
    // For multi-line statements
    else {
      commentedLines[startLine] = "/*\n" + commentedLines[startLine];
      commentedLines[endLine] = commentedLines[endLine] + "\n*/";
    }
  }

  return commentedLines.join("\n");
}

export default transformCode;

