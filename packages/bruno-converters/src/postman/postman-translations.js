import translateCode from '../utils/jscode-shift-translator';

const replacements = {
  'pm\\.environment\\.get\\(': 'bru.getEnvVar(',
  'pm\\.environment\\.set\\(': 'bru.setEnvVar(',
  'pm\\.variables\\.get\\(': 'bru.getVar(',
  'pm\\.variables\\.set\\(': 'bru.setVar(',
  'pm\\.variables\\.replaceIn\\(': 'bru.interpolate(',
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
  'pm\\.globals\\.set\\(': 'bru.setGlobalEnvVar(',
  'pm\\.globals\\.get\\(': 'bru.getGlobalEnvVar(',
  'pm\\.response\\.headers\\.get\\(': 'res.getHeader(',
  'pm\\.response\\.to\\.have\\.body\\(': 'expect(res.getBody()).to.equal(',
  'pm\\.response\\.to\\.have\\.header\\(': 'expect(res.getHeaders()).to.have.property(',
  'pm\\.environment\\.name': 'bru.getEnvName()',
  'pm\\.response\\.status': 'res.statusText',
  'pm\\.response\\.headers': 'res.getHeaders()',
  "tests\\['([^']+)'\\]\\s*=\\s*([^;]+);": 'test("$1", function() { expect(Boolean($2)).to.be.true; });',
  'pm\\.request\\.url': 'req.getUrl()',
  'pm\\.request\\.method': 'req.getMethod()',
  'pm\\.request\\.headers': 'req.getHeaders()',
  'pm\\.request\\.body': 'req.getBody()',
  'pm\\.info\\.requestName': 'req.getName()',
  // deprecated translations
  'postman\\.setEnvironmentVariable\\(': 'bru.setEnvVar(',
  'postman\\.getEnvironmentVariable\\(': 'bru.getEnvVar(',
  'postman\\.clearEnvironmentVariable\\(': 'bru.deleteEnvVar(',
  'pm\\.execution\\.skipRequest\\(\\)': 'bru.runner.skipRequest()',
  'pm\\.execution\\.skipRequest': 'bru.runner.skipRequest',
  'pm\\.execution\\.setNextRequest\\(null\\)': 'bru.runner.stopExecution()',
  'pm\\.execution\\.setNextRequest\\(\'null\'\\)': 'bru.runner.stopExecution()',

  'pm\\.cookies\\.get\\(': 'bru.cookies.get(',
  'pm\\.cookies\\.has\\(': 'bru.cookies.has(',
  'pm\\.cookies\\.toObject\\(\\)': 'bru.cookies.get()',
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

const processRegexReplacement = (code) => {
  for (const { regex, replacement } of compiledReplacements) {
    if (regex.test(code)) {
      code = code.replace(regex, replacement);

    }
  }
  if ((code.includes('pm.') || code.includes('postman.'))) {
    code = code.replace(/^(.*(pm\.|postman\.).*)$/gm, '// $1');
  }
  return code;
}


const postmanTranslation = (script, options = {}) => {
  let modifiedScript = Array.isArray(script) ? script.join('\n') : script;

  try {
    let translatedCode = translateCode(modifiedScript);
    if ((translatedCode.includes('pm.') || translatedCode.includes('postman.'))) {
      translatedCode = translatedCode.replace(/^(.*(pm\.|postman\.).*)$/gm, '// $1');
    }
    return translatedCode;
  } catch (e) {
    console.warn('Error in postman translation:', e);

    try {
      return processRegexReplacement(modifiedScript);
    } catch (e) {
      console.warn('Error in postman translation:', e);
      return modifiedScript;
    }
  }
};

export default postmanTranslation;