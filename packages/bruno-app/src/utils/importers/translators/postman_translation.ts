const replacements: Record<string, string> = {
  'pm\\.environment\\.get\\(([\'"])([^\'"]*)\\1\\)': 'bru.getEnv($1$2$1)',
  'pm\\.environment\\.set\\(([\'"])([^\'"]*)\\1, ([\'"])([^\'"]*)\\3\\)': 'bru.setEnv($1$2$1, $3$4$3)',
  'pm\\.variables\\.get\\(([\'"])([^\'"]*)\\1\\)': 'bru.getVar($1$2$1)',
  'pm\\.variables\\.set\\(([\'"])([^\'"]*)\\1, ([\'"])([^\'"]*)\\3\\)': 'bru.setVar($1$2$1, $3$4$3)'
};

export const postmanTranslation = (script: string) => {
  const modifiedScript = Object.entries(replacements)
    .map(([pattern, replacement]) => {
      const regex = new RegExp(pattern, 'g');
      return script.replace(regex, replacement);
    })
    .find((modified) => modified !== script);
  if (modifiedScript) {
    // translation successful
    return modifiedScript;
  } else {
    // non-translatable script
    return script.includes('pm.') ? `// ${script}` : script;
  }
};
