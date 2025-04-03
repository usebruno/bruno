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

const getAcornTranspiledCode = (code) => {
  return new Promise((resolve, reject) => {
    // Check if we're in a test environment (window.ipcRenderer is mocked)
    if (typeof window === 'undefined' || !window.ipcRenderer) {
      // Return the code as-is for testing
      return resolve(code);
    }
    
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:get-acorn-transpiled-code', code).then(resolve).catch(reject);
  });
};

export const postmanTranslation = async (script, logCallback) => {
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
      const acornTranspiledCode = await getAcornTranspiledCode(modifiedScript);
      modifiedScript = acornTranspiledCode;
    }

    return modifiedScript;
  } catch (e) {
    console.error('Error in postmanTranslation:', e);
    return script;
  }
};

export function commentOutAllLines(script) {
  if (Array.isArray(script)) {
    return script.map(line => `// ${line}`).join('\n');
  }

  return script.split('\n').map(line => `// ${line}`).join('\n');
}
