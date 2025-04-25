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
  'pm\\.response\\.text\\(\\)': 'JSON.stringify(res.getBody())',
  'pm\\.expect\\.fail\\(': 'expect.fail(',
  'pm\\.response\\.responseTime': 'res.getResponseTime()',
  'pm\\.environment\\.name': 'bru.getEnvName()',
  'pm\\.response\\.status': 'res.statusText',
  'pm\\.response\\.headers': 'req.getHeaders()',
  "tests\\['([^']+)'\\]\\s*=\\s*([^;]+);": 'test("$1", function() { expect(Boolean($2)).to.be.true; });',
  'pm\\.request\\.url': 'req.getUrl()',
  'pm\\.request\\.method': 'req.getMethod()',
  'pm\\.request\\.headers': 'req.getHeaders()',
  'pm\\.request\\.body': 'req.getBody()',
  // deprecated translations
  'postman\\.setEnvironmentVariable\\(': 'bru.setEnvVar(',
  'postman\\.getEnvironmentVariable\\(': 'bru.getEnvVar(',
  'postman\\.clearEnvironmentVariable\\(': 'bru.deleteEnvVar(',
  'pm\\.execution\\.skipRequest\\(\\)': 'bru.runner.skipRequest()',
  'pm\\.execution\\.skipRequest': 'bru.runner.skipRequest',
  'pm\\.execution\\.setNextRequest\\(null\\)': 'bru.runner.stopExecution()',
  'pm\\.execution\\.setNextRequest\\(\'null\'\\)': 'bru.runner.stopExecution()',
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

const postmanTranslation = (script) => {
  try {
    let modifiedScript = script;
    let modified = false;
    for (const { regex, replacement } of compiledReplacements) {
      if (regex.test(modifiedScript)) {
        modifiedScript = modifiedScript.replace(regex, replacement);
        modified = true;
      }
    }
    if (modifiedScript.includes('pm.') || modifiedScript.includes('postman.')) {
      modifiedScript = modifiedScript.replace(/^(.*(pm\.|postman\.).*)$/gm, '// $1');
    }
    return modifiedScript;
  } catch (e) {
    return script;
  }
};

export default postmanTranslation;