const replacements = {
  'pm\\.environment\\.get\\(': 'bru.getEnvVar(',
  'pm\\.environment\\.set\\(': 'bru.setEnvVar(',
  'pm\\.variables\\.get\\(': 'bru.getVar(',
  'pm\\.variables\\.set\\(': 'bru.setVar(',
  'pm\\.collectionVariables\\.get\\(': 'bru.getVar(',
  'pm\\.collectionVariables\\.set\\(': 'bru.setVar(',
  'pm\\.setNextRequest\\(': 'bru.setNextRequest(',
  'pm\\.test\\(': 'test(',
  'pm.response.to.have\\.status\\(': 'expect(res.getStatus()).to.equal(',
  'pm\\.response\\.to\\.have\\.status\\(': 'expect(res.getStatus()).to.equal(',
  'pm\\.response\\.json\\(': 'res.getBody(',
  'pm\\.expect\\(': 'expect(',
  'pm\\.environment\\.has\\(([^)]+)\\)': 'bru.getEnvVar($1) !== undefined && bru.getEnvVar($1) !== null',
  'pm\\.response\\.code': 'res.getStatus()',
  'pm\\.response\\.text\\(': 'res.getBody()?.toString('
};

const compiledReplacements = Object.entries(replacements).map(([pattern, replacement]) => ({
  regex: new RegExp(pattern, 'g'),
  replacement
}));

export const postmanTranslation = (script, logCallback) => {
  try {
    let modifiedScript = script;
    let modified = false;
    for (const { regex, replacement } of compiledReplacements) {
      if (regex.test(modifiedScript)) {
        modifiedScript = modifiedScript.replace(regex, replacement);
        modified = true;
      }
    }
    if (modifiedScript.includes('pm.')) {
      modifiedScript = modifiedScript.replace(/^(.*pm\..*)$/gm, '// $1');
      logCallback?.();
    }
    return modifiedScript;
  } catch (e) {
    return script;
  }
};
