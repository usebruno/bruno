/**
 * Detection, translation and classification of `pm.require()` / `require()`
 * calls inside Postman scripts being imported into Bruno.
 */

// String literals inside pm.require / require - single, double, or backtick
// quoted. We deliberately keep this simple and do not attempt to handle
// template strings with interpolation; those are not a Postman pattern.
const PM_REQUIRE_REGEX = /pm\.require\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
const BARE_REQUIRE_REGEX = /(?<![\w$.])require\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;

/**
 * Normalize a Postman/npm specifier into a plain package name.
 *
 *   "lodash"               -> "lodash"
 *   "npm:lodash"           -> "lodash"
 *   "npm:lodash@4.17.21"   -> "lodash"
 *   "lodash/get"           -> "lodash"
 *   "node:crypto"          -> "crypto"
 *   "@scope/pkg"           -> "@scope/pkg"
 *   "@scope/pkg/sub"       -> "@scope/pkg"
 *   "npm:@scope/pkg@1.2.3" -> "@scope/pkg"
 *   "./helpers"            -> null   (relative, not a package)
 *
 * Returns null when the input doesn't resolve to a recognizable package.
 */
const normalizePackageName = (raw) => {
  if (typeof raw !== 'string') return null;
  let name = raw.trim();
  if (!name) return null;
  if (name.startsWith('./') || name.startsWith('../') || name.startsWith('/')) {
    return null;
  }
  if (name.startsWith('npm:')) name = name.slice(4);
  if (name.startsWith('node:')) name = name.slice(5);
  // Scoped packages keep the leading '@'; only strip a *second* '@' as a version separator.
  const searchStart = name.startsWith('@') ? 1 : 0;
  const atIndex = name.indexOf('@', searchStart);
  if (atIndex !== -1) name = name.slice(0, atIndex);
  // Strip subpath imports so `lodash/get` and `@scope/pkg/sub` resolve to their package roots.
  if (name.startsWith('@')) {
    name = name.split('/').slice(0, 2).join('/');
  } else {
    name = name.split('/')[0];
  }
  return name || null;
};

const extractPackagesFromScript = (scriptSource) => {
  if (scriptSource == null) {
    return { translatedSource: scriptSource, packages: [] };
  }
  const sourceText = Array.isArray(scriptSource) ? scriptSource.join('\n') : String(scriptSource);
  const packages = new Set();

  const translated = sourceText.replace(PM_REQUIRE_REGEX, (_match, quote, rawName) => {
    const pkg = normalizePackageName(rawName);
    if (!pkg) {
      // Malformed/relative - drop the pm. prefix but leave the argument alone.
      return `require(${quote}${rawName}${quote})`;
    }
    packages.add(pkg);
    return `require(${quote}${pkg}${quote})`;
  });

  BARE_REQUIRE_REGEX.lastIndex = 0;
  let match;
  while ((match = BARE_REQUIRE_REGEX.exec(translated)) !== null) {
    const pkg = normalizePackageName(match[2]);
    if (pkg) packages.add(pkg);
  }

  return { translatedSource: translated, packages: Array.from(packages) };
};

// Packages exposed in Bruno's safe-mode (QuickJS) sandbox via shims.
// Source of truth: packages/bruno-js/src/sandbox/quickjs/shims/lib/index.js
const SAFE_MODE_PACKAGES = new Set([
  'uuid',
  'axios',
  'jsonwebtoken',
  'path',
  'nanoid'
]);

// Node.js built-ins. Available in Developer Mode via Node's CJS loader.
const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net',
  'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring',
  'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls',
  'trace_events', 'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads',
  'zlib'
]);

// Libraries reliably available in Developer Mode without an explicit install.
const BUNDLED_LIBRARIES = new Set([
  'chai',
  'moment',
  'lodash',
  'crypto-js'
]);

// Postman sandbox globals the Bruno translator turns into `require()` calls
// (see postman-to-bruno-translator.js :: POSTMAN_LIBRARY_GLOBALS). Scripts
// that use these as bare globals (`cheerio.load(...)`, `_.map(...)`) won't
// surface in the raw `pm.require`/`require` pre-scan, so we re-scan the
// translated source for these specific names. Listed explicitly so the
// post-scan can't pick up mangled artifacts of the translator's
// `s/\bpostman\b/pm/g` pass (e.g. `pm-collection` from `postman-collection`).
const TRANSLATOR_INJECTED_GLOBALS = new Set([
  'cheerio',
  'tv4',
  'crypto-js',
  'lodash',
  'moment'
]);

// Packages that don't have a meaningful equivalent in Bruno, these are
// Postman-specific runtime bits that ship with their app.
const UNSUPPORTED_EXACT = new Set([
  'postman-collection',
  'postman-runtime',
  'postman-request',
  'newman'
]);
const UNSUPPORTED_PREFIXES = ['@postman/', '@team/'];

const isUnsupported = (name) => {
  if (UNSUPPORTED_EXACT.has(name)) return true;
  return UNSUPPORTED_PREFIXES.some((prefix) => name.startsWith(prefix));
};

const classifyPackages = (packages) => {
  const unique = Array.from(new Set((packages || []).filter(Boolean))).sort();
  const report = {
    safeMode: [],
    devMode: [],
    needsInstall: [],
    unsupported: []
  };

  for (const name of unique) {
    if (isUnsupported(name)) {
      report.unsupported.push(name);
    } else if (SAFE_MODE_PACKAGES.has(name)) {
      report.safeMode.push(name);
    } else if (NODE_BUILTINS.has(name) || BUNDLED_LIBRARIES.has(name)) {
      report.devMode.push(name);
    } else {
      report.needsInstall.push(name);
    }
  }

  return report;
};

const buildPackageReport = (packages) => {
  const classified = classifyPackages(packages);
  const hasAny
    = classified.needsInstall.length
      + classified.unsupported.length
      + classified.devMode.length
      > 0;
  return { ...classified, hasAny };
};

export {
  normalizePackageName,
  extractPackagesFromScript,
  classifyPackages,
  buildPackageReport,
  SAFE_MODE_PACKAGES,
  NODE_BUILTINS,
  BUNDLED_LIBRARIES,
  TRANSLATOR_INJECTED_GLOBALS
};
