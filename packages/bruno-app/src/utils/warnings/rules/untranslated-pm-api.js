const PM_PATTERN = /(?:^|[^./\w])(?:pm|postman)\.(\w+(?:\.\w+)*)/gm;

/**
 * Strip comments and string literals from code so the regex
 * only matches live (uncommented, non-string) API calls.
 * Replaces matches with spaces to preserve character offsets.
 */
const stripCommentsAndStrings = (code) => {
  return code.replace(
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g,
    (match) => ' '.repeat(match.length)
  );
};

/**
 * Detect remaining untranslated pm/postman API calls in code.
 * Returns an array of unique API strings like ["pm.vault", "pm.iterationData.get"].
 */
const detectUntranslatedApis = (code) => {
  if (!code || typeof code !== 'string') return [];
  const strippedCode = stripCommentsAndStrings(code);
  const apis = [];
  PM_PATTERN.lastIndex = 0;
  let match;
  while ((match = PM_PATTERN.exec(strippedCode)) !== null) {
    const api = match[0].trim();
    if (!apis.includes(api)) apis.push(api);
  }
  return apis;
};

const LOCATION_MAP = {
  'pre-request script': 'pre-request-script',
  'post-response script': 'post-response-script',
  'tests': 'tests'
};

const makeWarning = (locationLabel, api) => ({
  type: 'untranslated-api',
  ruleId: 'untranslated-pm-api',
  severity: 'warning',
  dismissible: true,
  location: LOCATION_MAP[locationLabel],
  message: `Untranslated Postman API in ${locationLabel}: ${api}`
});

/**
 * Check a script object ({ req, res }) and a tests string for untranslated APIs.
 * Returns an array of warning objects.
 */
const checkScripts = (script, tests) => {
  const warnings = [];

  if (script) {
    detectUntranslatedApis(script.req).forEach((api) => {
      warnings.push(makeWarning('pre-request script', api));
    });

    detectUntranslatedApis(script.res).forEach((api) => {
      warnings.push(makeWarning('post-response script', api));
    });
  }

  detectUntranslatedApis(tests).forEach((api) => {
    warnings.push(makeWarning('tests', api));
  });

  return warnings;
};

const untranslatedPmApiRule = {
  ruleId: 'untranslated-pm-api',
  type: 'untranslated-api',
  severity: 'warning',
  dismissible: true,
  validate(item) {
    if (item.type === 'folder') {
      return checkScripts(item?.root?.request?.script, item?.root?.request?.tests);
    }
    return checkScripts(item?.request?.script, item?.request?.tests);
  }
};

export default untranslatedPmApiRule;
