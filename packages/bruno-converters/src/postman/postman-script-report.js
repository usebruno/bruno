/**
 * Measures the `pm.*` API surface of a Postman script, so an import can report
 * how much of it the translator covered. Counting lives beside the translator so
 * script text never crosses a worker or IPC boundary.
 *
 * Only API identifiers and counts may escape — never arguments, values, URLs or
 * script bodies. Hence computed access goes unreported, and hence not reusing
 * `getMemberExpressionString`, which inlines string-literal keys
 * (`pm['secret_token']` -> "pm.secret_token").
 */

import { parse } from '@babel/parser';
import { extractPackagesFromScript } from './postman-package-detector';

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

/**
 * Measures one translated block; untranslated call sites are the `pm.*`
 * references still standing in the output.
 *
 * @param {{source: string, translated: string, fellBackToRegex: boolean}} block
 * @returns {Object|null} null when the block held no script or could not be
 *   measured — one unmeasurable block must not cost the import its report.
 */
export const buildScriptUsage = ({ source, translated, fellBackToRegex }) => {
  if (!source || !source.trim()) return null;

  // A fallback never translated structurally, so it counts towards neither side
  // of the ratio.
  if (fellBackToRegex) {
    return { apiUsagesTotal: 0, apiUsagesUntranslated: 0, untranslatedApis: {}, fellBackToRegex: true };
  }

  try {
    const sourceApis = countPmApiUsages(source);
    const { translatedSource } = extractPackagesFromScript(translated);
    const untranslated = countPmApiUsages(translatedSource);
    const untranslatedApis = {};

    for (const [api, count] of Object.entries(untranslated.byApi)) {
      const name = restoreLegacyRoot(api, sourceApis.byApi);
      untranslatedApis[name] = (untranslatedApis[name] || 0) + count;
    }

    return {
      apiUsagesTotal: sourceApis.total,
      apiUsagesUntranslated: untranslated.total,
      untranslatedApis,
      fellBackToRegex: false
    };
  } catch (err) {
    // Measurement must never fail an import.
    console.warn('Could not measure Postman script translation:', err?.message);
    return null;
  }
};

// Translation never ran, so the counts would describe nothing.
export const buildPreservedScriptsReport = () => ({ preserveScripts: true });

const emptyReport = () => ({
  preserveScripts: false,
  fullyTranslated: true,
  apiUsagesTotal: 0,
  apiUsagesUntranslated: 0,
  untranslatedApis: {},
  scriptsUsingRegexFallback: 0
});

const toReport = (usage) => ({
  preserveScripts: false,
  fullyTranslated: usage.apiUsagesUntranslated === 0 && !usage.fellBackToRegex,
  apiUsagesTotal: usage.apiUsagesTotal,
  apiUsagesUntranslated: usage.apiUsagesUntranslated,
  untranslatedApis: usage.untranslatedApis,
  scriptsUsingRegexFallback: usage.fellBackToRegex ? 1 : 0
});

/**
 * Sums reports into one, for both roll-ups: a collection's measured blocks, and
 * a bulk import's per-collection reports into its single entry.
 *
 * @returns {Object|null} null when nothing was reported, which is how an import
 *   of no Postman collection ends up with no report at all.
 */
export const mergeScriptTranslationReports = (reports) => {
  const present = (reports || []).filter(Boolean);
  if (present.length === 0) return null;

  // One "preserve scripts" choice covers a whole import, so the flag is all
  // there is to merge.
  if (present.every((report) => report.preserveScripts)) return buildPreservedScriptsReport();

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

/**
 * Rolls one collection's measured blocks into its report. Always returns one,
 * even with no script at all: zeroes say "nothing to translate", where no report
 * is indistinguishable from an import that was never measured.
 */
export const aggregateScriptUsage = (usages) =>
  mergeScriptTranslationReports((usages || []).filter(Boolean).map(toReport)) || emptyReport();
