const replacements = {
  'pm\\.environment\\.get\\(([\'"])([^\'"]*)\\1\\)': 'bru.getEnvVar($1$2$1)',
  'pm\\.environment\\.set\\(([\'"])([^\'"]*)\\1, ([\'"])([^\'"]*)\\3\\)': 'bru.setEnvVar($1$2$1, $3$4$3)',
  'pm\\.variables\\.get\\(([\'"])([^\'"]*)\\1\\)': 'bru.getVar($1$2$1)',
  'pm\\.variables\\.set\\(([\'"])([^\'"]*)\\1, ([\'"])([^\'"]*)\\3\\)': 'bru.setVar($1$2$1, $3$4$3)'
};

export const postmanTranslation = (script) => {
  try {
    const modifiedScript = Object.entries(replacements || {})
      .map(([pattern, replacement]) => {
        const regex = new RegExp(pattern, 'g');
        return script?.replace(regex, replacement);
      })
      .find((modified) => modified !== script);
    if (modifiedScript) {
      // translation successful
      return modifiedScript;
    } else {
      // non-translatable script
      return script?.includes('pm.') ? `// ${script}` : script;
    }
  } catch (e) {
    // non-translatable script
    return script?.includes('pm.') ? `// ${script}` : script;
  }
};
