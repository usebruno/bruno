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
  
  // Response Headers
  'pm\\.response\\.headers': 'res.getHeaders()',
  'pm\\.response\\.headers\\.get\\(([^)]+)\\)': 'res.getHeader($1)',
  
  // Response Cookies
  'pm\\.response\\.cookies': 'res.getCookies()',
  'pm\\.response\\.cookies\\.get\\(([^)]+)\\)': 'res.getCookie($1)',
  
  // Response Status
  'pm\\.response\\.status': 'res.getStatus()',
  'pm\\.response\\.statusCode': 'res.getStatus()',
  
  // Response Body
  'pm\\.response\\.body': 'res.getBody()',
  
  // Request Information
  'pm\\.request\\.url': 'req.getUrl()',
  'pm\\.request\\.method': 'req.getMethod()',
  'pm\\.request\\.headers': 'req.getHeaders()',
  'pm\\.request\\.body': 'req.getBody()',
  
  // Testing Assertions
  'pm\\.expect\\(([^)]+)\\)\\.to\\.be\\.true': 'expect($1).to.be.true',
  'pm\\.expect\\(([^)]+)\\)\\.to\\.be\\.false': 'expect($1).to.be.false',
  'pm\\.expect\\(([^)]+)\\)\\.to\\.be\\.null': 'expect($1).to.be.null',
  'pm\\.expect\\(([^)]+)\\)\\.to\\.be\\.undefined': 'expect($1).to.be.undefined',
  'pm\\.expect\\(([^)]+)\\)\\.to\\.be\\.a\\(([^)]+)\\)': 'expect($1).to.be.a($2)',
  'pm\\.expect\\(([^)]+)\\)\\.to\\.be\\.an\\(([^)]+)\\)': 'expect($1).to.be.an($2)',
  'pm\\.expect\\(([^)]+)\\)\\.to\\.have\\.lengthOf\\(([^)]+)\\)': 'expect($1).to.have.lengthOf($2)',
  'pm\\.expect\\(([^)]+)\\)\\.to\\.include\\(([^)]+)\\)': 'expect($1).to.include($2)',
  
  // Request/Response Information
  'pm\\.info\\.requestName': 'req.getName()',
  'pm\\.info\\.requestId': 'req.getId()',
  
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