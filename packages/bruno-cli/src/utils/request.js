
// Check for meaningful test() calls (not commented out or in strings)
const hasExecutableTestInScript = (script) => {
  if (!script) return false;
  
  // Remove single-line comments (// ...) and multi-line comments (/* ... */)
  let cleanScript = script
    .replace(/\/\/.*$/gm, '')  // Remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
  
  // Remove string literals to avoid matching test() inside strings
  cleanScript = cleanScript
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')  // Remove double-quoted strings
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")  // Remove single-quoted strings
    .replace(/`(?:[^`\\]|\\.)*`/g, '``'); // Remove template literals
  
  // Look for standalone test() calls (not object method calls like obj.test())
  // Find all test( occurrences and check they're not preceded by dots
  let hasValidTest = false;
  let searchFrom = 0;
  
  while (true) {
    const index = cleanScript.indexOf('test', searchFrom);
    if (index === -1) break;
    
    // Check if this looks like test( with optional whitespace
    const afterTest = cleanScript.substring(index + 4);
    if (/^\s*\(/.test(afterTest)) {
      // Found test( - check if it's not preceded by a dot
      if (index === 0 || cleanScript[index - 1] !== '.') {
        hasValidTest = true;
        break;
      }
    }
    
    searchFrom = index + 1;
  }
  
  return hasValidTest;
};

module.exports = {
  hasExecutableTestInScript
};