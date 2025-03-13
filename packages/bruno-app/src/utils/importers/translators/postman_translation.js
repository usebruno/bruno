const replacements = {
  'pm\\.environment\\.get\\(': 'bru.getEnvVar(',
  'pm\\.environment\\.set\\(': 'bru.setEnvVar(',
  'pm\\.variables\\.get\\(': 'bru.getVar(',
  'pm\\.variables\\.set\\(': 'bru.setVar(',
  'pm\\.collectionVariables\\.get\\(': 'bru.getVar(',
  'pm\\.collectionVariables\\.set\\(': 'bru.setVar(',
  'pm\\.collectionVariables\\.has\\(': 'bru.hasVar(',
  'pm\\.collectionVariables\\.unset\\(': 'bru.deleteVar(',
  'pm\\.setNextRequest\\(': 'bru.setNextRequest(',
  'pm\\.test\\(': 'test(',
  'pm.response.to.have\\.status\\(': 'expect(res.getStatus()).to.equal(',
  'pm\\.response\\.to\\.have\\.status\\(': 'expect(res.getStatus()).to.equal(',
  'pm\\.response\\.json\\(': 'res.getBody(',
  'pm\\.expect\\(': 'expect(',
  'pm\\.environment\\.has\\(([^)]+)\\)': 'bru.getEnvVar($1) !== undefined && bru.getEnvVar($1) !== null',
  'pm\\.response\\.code': 'res.getStatus()',
  'pm\\.response\\.text\\(': 'res.getBody()?.toString(',
  'pm\\.expect\\.fail\\(': 'expect.fail(',
  'pm\\.response\\.responseTime': 'res.getResponseTime()',
  'pm\\.environment\\.name': 'bru.getEnvName()',
  "tests\\['([^']+)'\\]\\s*=\\s*([^;]+);": 'test("$1", function() { expect(Boolean($2)).to.be.true; });',
  // deprecated translations
  'postman\\.setEnvironmentVariable\\(': 'bru.setEnvVar(',
  'postman\\.getEnvironmentVariable\\(': 'bru.getEnvVar(',
  'postman\\.clearEnvironmentVariable\\(': 'bru.deleteEnvVar(',
  'pm\\.execution\\.skipRequest\\(\\)': 'bru.runner.skipRequest()',
  'pm\\.execution\\.skipRequest': 'bru.runner.skipRequest',
  'pm\\.execution\\.setNextRequest\\(null\\)': 'bru.runner.stopExecution()',
  "pm\\.execution\\.setNextRequest\\('null'\\)": 'bru.runner.stopExecution()'
};

const extendedReplacements = Object.keys(replacements).reduce((acc, key) => {
  const newKey = key.replace(/^pm\\\./, 'postman\\.');
  acc[key] = replacements[key];
  acc[newKey] = replacements[key];
  return acc;
}, {});

const compiledReplacements = Object.entries(extendedReplacements).map(([pattern, replacement]) => ({
  regex: new RegExp(pattern, 'g'),
  replacement
}));

export const postmanTranslation = (script, logCallback) => {
  try {
    let modifiedScript = Array.isArray(script) ? script.join('\n') : script;
    let modified = false;

    for (const { regex, replacement } of compiledReplacements) {
      if (regex.test(modifiedScript)) {
        modifiedScript = modifiedScript.replace(regex, replacement);
        modified = true;
      }
    }
    if (modifiedScript.includes('pm.') || modifiedScript.includes('postman.')) {
      // Comment out unsupported pm commands without parentheses
      const unsupportedPmRegex = /(^\s*pm\.[a-zA-Z]+\b(?!\s*\())/gm;
      modifiedScript = modifiedScript.replace(unsupportedPmRegex, (match) => `// ${match}`);

      // Comment out unsupported pm commands with parentheses
      const regex = /(^\s*(pm|postman)\b[\s\S]*?\()/gm;
      let match;

      while ((match = regex.exec(modifiedScript)) !== null) {
        const startIndex = match.index;
        const endIndex = findMatchingParenthesis(modifiedScript, startIndex + match[0].length - 1);

        if (endIndex !== -1) {
          const block = modifiedScript.slice(startIndex, endIndex + 1);
          const commentedBlock = block
            .split('\n')
            .map((line) => {
              if (line.trim() === '') return line;
              return `// ${line}`;
            })
            .join('\n');

          modifiedScript = modifiedScript.slice(0, startIndex) + commentedBlock + modifiedScript.slice(endIndex + 1);
        }
      }
      // logCallback?.();
    }

    return modifiedScript;
  } catch (e) {
    return script;
  }
};

function findMatchingParenthesis(script, startIndex) {
  let stack = [];
  for (let i = startIndex; i < script.length; i++) {
    if (script[i] === '(') {
      stack.push('(');
    } else if (script[i] === ')') {
      stack.pop();
      if (stack.length === 0) {
        return i;
      }
    }
  }
  return -1; // No matching parenthesis found
}

export function commentOutAllLines(script) {
  if (Array.isArray(script)) {
    return script.map(line => `// ${line}`).join('\n');
  }

  return script.split('\n').map(line => `// ${line}`).join('\n');
}
