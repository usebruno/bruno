const replacements = {
  'pm\\.environment\\.get\\(': 'bru.getEnvVar(',
  'pm\\.environment\\.set\\(': 'bru.setEnvVar(',
  'pm\\.variables\\.get\\(': 'bru.getVar(',
  'pm\\.variables\\.set\\(': 'bru.setVar(',
  'pm\\.collectionVariables\\.get\\(': 'bru.getVar(',
  'pm\\.collectionVariables\\.set\\(': 'bru.setVar(',
  'pm\\.setNextRequest\\(': 'bru.setNextRequest(',
  'pm\\.test\\(': 'test(',
  'pm.response.to.have\\.status\\(': 'expect(res.getStatus()).to.equal('
};

const compiledReplacements = Object.entries(replacements).map(([pattern, replacement]) => ({
  regex: new RegExp(pattern, 'g'),
  replacement
}));

export const postmanTranslation = (script) => {
  try {
    let modifiedScript = script;
    let modified = false;
    for (const { regex, replacement } of compiledReplacements) {
      if (regex.test(modifiedScript)) {
        modifiedScript = modifiedScript.replace(regex, replacement);
        modified = true;
      }
    }
    if (modified && modifiedScript.includes('pm.')) {
      modifiedScript = modifiedScript.replace(/^(.*pm\..*)$/gm, '// $1');
    }
    return modifiedScript;
  } catch (e) {
    return script;
  }
};
