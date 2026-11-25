/**
 * Measures the `pm.*` API surface of a Postman import, so it can report how much
 * of it the translator covered. Both sides are read once the import is done — the
 * Postman source for the total, the Bruno collection for what the translator left
 * behind — so no measurement has to travel through the translator or its workers.
 *
 * Only API identifiers and counts may escape — never arguments, values, URLs or
 * script bodies. Hence computed access goes unreported, and hence not reusing
 * `getMemberExpressionString`, which inlines string-literal keys
 * (`pm['secret_token']` -> "pm.secret_token").
 */

import { parse } from '@babel/parser';
import { forEachBrunoScript, forEachPostmanScript } from './postman-script-sources';

// Mirrors jscodeshift's babel5Compat grammar, so whatever the translator parses parses here.
const PARSE_OPTIONS = {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  attachComment: false,
  plugins: [
    // Without it `pm?.a.b` is an OptionalMemberExpression, which goes uncounted.
    'estree',
    'jsx',
    'doExpressions',
    'functionBind',
    'functionSent',
    ['decorators', { decoratorsBeforeExport: false }]
  ]
};

// Pruning only: neither can hold a member expression.
const LEAF_TYPES = new Set([
  'Identifier',
  'Literal',
  'PrivateIdentifier',
  'PrivateName',
  'Super',
  'ThisExpression',
  'TemplateElement',
  'EmptyStatement',
  'DebuggerStatement'
]);
const NON_CHILD_KEYS = new Set([
  'type',
  'start',
  'end',
  'loc',
  'range',
  'extra',
  'leadingComments',
  'trailingComments',
  'innerComments'
]);

// Both roots are counted, each kept distinct: `postman.setEnvironmentVariable`
// has no `pm.*` equivalent, so folding them together would invent an API name
// and collide with genuine `pm.*` keys.
const CURRENT_ROOT = 'pm';
const LEGACY_ROOT = 'postman';
const POSTMAN_ROOTS = new Set([CURRENT_ROOT, LEGACY_ROOT]);

/**
 * Resolves a member chain from its outermost link down the object spine.
 *
 *   pm.environment.get('KEY')       -> pm.environment.get
 *   pm.cookies.jar().getCookie(x)   -> pm.cookies.jar   (call terminates)
 *   pm['secret_token']              -> null             (never the key)
 *   pm.environment['k'].get()       -> null             (computed voids the chain)
 */
const buildApiIdentifier = (node) => {
  const segments = [];
  let current = node;

  while (current.type === 'MemberExpression') {
    if (current.computed || current.property.type !== 'Identifier') return null;
    segments.unshift(current.property.name);
    current = current.object;
  }

  if (current.type !== 'Identifier' || !POSTMAN_ROOTS.has(current.name)) return null;

  segments.unshift(current.name);
  return segments.join('.');
};

const isWholeMemberChain = (node, parent) =>
  node.type === 'MemberExpression' && !(parent?.type === 'MemberExpression' && parent.object === node);

// One entry per root reference, whatever the chain depth: a looped call and
// `pm.response.to.have.status(200)` are each a single call site. Property-style
// APIs (`pm.info.requestName`) count too — the translator must map them alike.
export const countPmApiUsages = (script) => {
  const byApi = {};
  let total = 0;

  const visit = (node, parent) => {
    if (isWholeMemberChain(node, parent)) {
      const identifier = buildApiIdentifier(node);
      if (identifier) {
        byApi[identifier] = (byApi[identifier] || 0) + 1;
        total++;
      }
    }

    if (LEAF_TYPES.has(node.type)) return;

    for (const key in node) {
      if (NON_CHILD_KEYS.has(key)) continue;
      const value = node[key];

      if (Array.isArray(value)) {
        for (const child of value) {
          if (typeof child?.type === 'string') visit(child, node);
        }
      } else if (typeof value?.type === 'string') {
        visit(value, node);
      }
    }
  };

  visit(parse(script, PARSE_OPTIONS).program, null);

  return { total, byApi };
};

/**
 * The translator rewrites `postman` to `pm` before parsing, so a surviving
 * legacy call reaches the output already normalized. Reporting it as written
 * keeps the report from naming an API that does not exist.
 */
const restoreLegacyRoot = (api, sourceApis) => {
  if (sourceApis[api] || !api.startsWith(`${CURRENT_ROOT}.`)) return api;

  const legacy = `${LEGACY_ROOT}.${api.slice(CURRENT_ROOT.length + 1)}`;
  return sourceApis[legacy] ? legacy : api;
};

// The only two the importer translates; anything else never reaches the output.
const TRANSLATED_EVENTS = new Set(['prerequest', 'test']);

const collectPostmanScripts = (postmanCollection) => {
  const scripts = [];

  forEachPostmanScript(postmanCollection, (script, listen) => {
    if (TRANSLATED_EVENTS.has(listen)) scripts.push(script);
  });

  return scripts;
};

/**
 * Sound only on the Bruno side. There, a parse result is purely a count, so
 * output naming neither root holds nothing to report whether or not it parses.
 * On the Postman side the parse doubles as the fallback signal, so every source
 * script has to be parsed, root or no root.
 */
const mentionsPostmanRoot = (script) => script.includes(CURRENT_ROOT) || script.includes(LEGACY_ROOT);

const collectBrunoScripts = (brunoCollection) => {
  const scripts = [];

  forEachBrunoScript(brunoCollection, (script) => {
    if (mentionsPostmanRoot(script)) scripts.push(script);
  });

  return scripts;
};

const measure = (scripts) => {
  const byApi = {};
  let total = 0;
  let unparseable = 0;

  for (const script of scripts) {
    if (typeof script !== 'string' || !script.trim()) continue;

    try {
      const usages = countPmApiUsages(script);
      total += usages.total;
      for (const [api, count] of Object.entries(usages.byApi)) {
        byApi[api] = (byApi[api] || 0) + count;
      }
    } catch {
      unparseable++;
    }
  }

  return { total, byApi, unparseable };
};

// Translation never ran, so the counts would describe nothing.
const preservedScriptsReport = () => ({ preserveScripts: true });

const emptyReport = () => ({
  preserveScripts: false,
  fullyTranslated: true,
  apiUsagesTotal: 0,
  apiUsagesUntranslated: 0,
  untranslatedApis: {},
  scriptsUsingRegexFallback: 0
});

/**
 * Builds an import's one report, by measuring the Postman source it was given
 * against the Bruno collection it produced.
 *
 * Zeroes mean "nothing to translate" — distinct from an import of something
 * other than Postman, which produces no report at all.
 */
export const buildScriptTranslationReport = ({ postmanCollection, brunoCollection, preserveScripts }) => {
  if (preserveScripts) return preservedScriptsReport();

  const source = measure(collectPostmanScripts(postmanCollection));
  const remaining = measure(collectBrunoScripts(brunoCollection));

  const untranslatedApis = {};
  for (const [api, count] of Object.entries(remaining.byApi)) {
    const name = restoreLegacyRoot(api, source.byApi);
    untranslatedApis[name] = (untranslatedApis[name] || 0) + count;
  }

  // A source script that won't parse is precisely what sends the translator to its
  // regex pass, whose output won't parse either — so it sits out both counts above.
  const scriptsUsingRegexFallback = source.unparseable;

  return {
    preserveScripts: false,
    // `remaining.unparseable` too: output we could not read is output we cannot vouch for.
    fullyTranslated: remaining.total === 0 && remaining.unparseable === 0 && scriptsUsingRegexFallback === 0,
    apiUsagesTotal: source.total,
    apiUsagesUntranslated: remaining.total,
    untranslatedApis,
    scriptsUsingRegexFallback
  };
};

/**
 * Sums a bulk import's per-collection reports into its single entry.
 *
 * @returns {Object|null} null when nothing was reported, which is how an import
 *   of no Postman collection ends up with no report at all.
 */
export const mergeScriptTranslationReports = (reports) => {
  const present = (reports || []).filter(Boolean);
  if (present.length === 0) return null;

  // One "preserve scripts" choice covers a whole import, so the flag is all
  // there is to merge.
  if (present.every((report) => report.preserveScripts)) return preservedScriptsReport();

  const merged = emptyReport();

  for (const report of present) {
    merged.apiUsagesTotal += report.apiUsagesTotal || 0;
    merged.apiUsagesUntranslated += report.apiUsagesUntranslated || 0;
    merged.scriptsUsingRegexFallback += report.scriptsUsingRegexFallback || 0;

    for (const [api, count] of Object.entries(report.untranslatedApis || {})) {
      merged.untranslatedApis[api] = (merged.untranslatedApis[api] || 0) + count;
    }
  }

  // Recomputed, not ANDed, so the merged flag means what a single one does.
  merged.fullyTranslated = merged.apiUsagesUntranslated === 0 && merged.scriptsUsingRegexFallback === 0;
  return merged;
};
