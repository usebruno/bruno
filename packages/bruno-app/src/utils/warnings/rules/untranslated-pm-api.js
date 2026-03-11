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
 * Compute the 1-based line number for a given character index in code.
 */
const getLineNumber = (code, index) => {
  let line = 1;
  for (let i = 0; i < index && i < code.length; i++) {
    if (code[i] === '\n') line++;
  }
  return line;
};

/**
 * Detect remaining untranslated pm/postman API calls in code.
 * Returns an array of { api, line } objects with unique APIs.
 */
const detectUntranslatedApis = (code) => {
  if (!code || typeof code !== 'string') return [];
  const strippedCode = stripCommentsAndStrings(code);
  const seen = new Set();
  const results = [];
  PM_PATTERN.lastIndex = 0;
  let match;
  while ((match = PM_PATTERN.exec(strippedCode)) !== null) {
    const api = match[0].trim();
    if (!seen.has(api)) {
      seen.add(api);
      const apiStart = match.index + (match[0].length - match[0].trimStart().length);
      results.push({ api, line: getLineNumber(code, apiStart) });
    }
  }
  return results;
};

const LOCATION_MAP = {
  'pre-request script': 'pre-request-script',
  'post-response script': 'post-response-script',
  'tests': 'tests'
};

const makeWarning = (locationLabel, api, line) => ({
  type: 'untranslated-api',
  ruleId: 'untranslated-pm-api',
  severity: 'warning',
  dismissible: true,
  location: LOCATION_MAP[locationLabel],
  message: `Unsupported Postman API in ${locationLabel}: ${api}`,
  line
});

/**
 * Check a script object ({ req, res }) and a tests string for untranslated APIs.
 * Returns an array of warning objects.
 */
const checkScripts = (script, tests) => {
  const warnings = [];

  if (script) {
    detectUntranslatedApis(script.req).forEach(({ api, line }) => {
      warnings.push(makeWarning('pre-request script', api, line));
    });

    detectUntranslatedApis(script.res).forEach(({ api, line }) => {
      warnings.push(makeWarning('post-response script', api, line));
    });
  }

  detectUntranslatedApis(tests).forEach(({ api, line }) => {
    warnings.push(makeWarning('tests', api, line));
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
