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

import j from 'jscodeshift';
import { extractPackagesFromScript } from './postman-package-detector';

// Both roots are counted, each kept distinct: `postman.setEnvironmentVariable`
// has no `pm.*` equivalent, so folding them together would invent an API name
// and collide with genuine `pm.*` keys.
const CURRENT_ROOT = 'pm';
const LEGACY_ROOT = 'postman';
const POSTMAN_ROOTS = new Set([CURRENT_ROOT, LEGACY_ROOT]);

/**
 * Walks outward from the root through the enclosing member/call chain.
 *
 *   pm.environment.get('KEY')       -> pm.environment.get
 *   pm.cookies.jar().getCookie(x)   -> pm.cookies.jar   (call terminates)
 *   pm['secret_token']              -> null             (never the key)
 */
const buildApiIdentifier = (rootPath) => {
  const segments = [rootPath.value.name];
  let current = rootPath;

  for (;;) {
    const parent = current.parent;
    if (!parent) break;
    const node = parent.value;

    if (node.type === 'MemberExpression' && node.object === current.value) {
      if (node.computed || node.property.type !== 'Identifier') return null;

      segments.push(node.property.name);
      current = parent;
      continue;
    }

    break;
  }

  return segments.join('.');
};

// One entry per root reference, whatever the chain depth: a looped call and
// `pm.response.to.have.status(200)` are each a single call site. Property-style
// APIs (`pm.info.requestName`) count too — the translator must map them alike.
export const countApiCalls = (script) => {
  const byApi = {};
  let total = 0;

  j(script)
    .find(j.Identifier)
    .forEach((path) => {
      if (!POSTMAN_ROOTS.has(path.value.name)) return;

      // Rules out the global as a plain value, property keys, and members of
      // unrelated objects.
      const parent = path.parent?.value;
      if (parent?.type !== 'MemberExpression' || parent.object !== path.value) return;

      const identifier = buildApiIdentifier(path);
      if (!identifier) return;

      byApi[identifier] = (byApi[identifier] || 0) + 1;
      total++;
    });

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
    return { apiCallsTotal: 0, apiCallsUntranslated: 0, untranslatedApis: {}, fellBackToRegex: true };
  }

  try {
    const sourceApis = countApiCalls(source);
    const { translatedSource } = extractPackagesFromScript(translated);
    const untranslated = countApiCalls(translatedSource);
    const untranslatedApis = {};

    for (const [api, count] of Object.entries(untranslated.byApi)) {
      const name = restoreLegacyRoot(api, sourceApis.byApi);
      untranslatedApis[name] = (untranslatedApis[name] || 0) + count;
    }

    return {
      apiCallsTotal: sourceApis.total,
      apiCallsUntranslated: untranslated.total,
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
  apiCallsTotal: 0,
  apiCallsUntranslated: 0,
  untranslatedApis: {},
  scriptsFellBackToRegex: 0
});

const toReport = (usage) => ({
  preserveScripts: false,
  fullyTranslated: usage.apiCallsUntranslated === 0 && !usage.fellBackToRegex,
  apiCallsTotal: usage.apiCallsTotal,
  apiCallsUntranslated: usage.apiCallsUntranslated,
  untranslatedApis: usage.untranslatedApis,
  scriptsFellBackToRegex: usage.fellBackToRegex ? 1 : 0
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
    merged.apiCallsTotal += report.apiCallsTotal || 0;
    merged.apiCallsUntranslated += report.apiCallsUntranslated || 0;
    merged.scriptsFellBackToRegex += report.scriptsFellBackToRegex || 0;

    for (const [api, count] of Object.entries(report.untranslatedApis || {})) {
      merged.untranslatedApis[api] = (merged.untranslatedApis[api] || 0) + count;
    }
  }

  // Recomputed, not ANDed, so the merged flag means what a single one does.
  merged.fullyTranslated = merged.apiCallsUntranslated === 0 && merged.scriptsFellBackToRegex === 0;
  return merged;
};

/**
 * Rolls one collection's measured blocks into its report. Always returns one,
 * even with no script at all: zeroes say "nothing to translate", where no report
 * is indistinguishable from an import that was never measured.
 */
export const aggregateScriptUsage = (usages) =>
  mergeScriptTranslationReports((usages || []).filter(Boolean).map(toReport)) || emptyReport();
