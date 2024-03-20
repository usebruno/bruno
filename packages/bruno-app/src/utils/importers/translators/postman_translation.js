const replacements = {
  'pm\\.environment\\.get\\(([\'"])([^\'"]*)\\1\\)': 'bru.getEnvVar($1$2$1)',
  'pm\\.environment\\.set\\(([\'"])([^\'"]*)\\1, ([\'"])([^\'"]*)\\3\\)': 'bru.setEnvVar($1$2$1, $3$4$3)',
  'pm\\.variables\\.get\\(([\'"])([^\'"]*)\\1\\)': 'bru.getVar($1$2$1)',
  'pm\\.variables\\.set\\(([\'"])([^\'"]*)\\1, ([\'"])([^\'"]*)\\3\\)': 'bru.setVar($1$2$1, $3$4$3)',
  'pm\\.collectionVariables\\.get\\(([\'"])([^\'"]*)\\1\\)': 'bru.getVar($1$2$1)',
  'pm\\.collectionVariables\\.set\\(([\'"])([^\'"]*)\\1, ([\'"])([^\'"]*)\\3\\)': 'bru.setVar($1$2$1, $3$4$3)'
};

const compiledReplacements = Object.entries(replacements).map(([pattern, replacement]) => ({
  regex: new RegExp(pattern, 'g'),
  replacement
}));

export const postmanTranslation = (script) => {
  try {
    let modifiedScript = script;
    for (const { regex, replacement } of compiledReplacements) {
      modifiedScript = modifiedScript.replace(regex, replacement);
    }

    return modifiedScript !== script ? modifiedScript : `// ${script}`;
  } catch (e) {
    return `// ${script}`;
  }
};
