const rollup = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const terser = require('@rollup/plugin-terser').default;
const fs = require('fs');
const path = require('path');

/**
 * Builds the FormatJS Intl polyfill bundle evaluated inside the QuickJS sandbox
 * (QuickJS ships without ICU, so `Intl` is otherwise undefined).
 *
 * The bundle is configured through env vars so different footprints can be
 * compared without touching code:
 *
 *   BRUNO_INTL_FEATURES  comma list of polyfills, or `all` (default `all`)
 *                        pluralrules,numberformat,datetimeformat,relativetimeformat,listformat,displaynames,collator
 *                        Dependencies are added automatically (e.g. datetimeformat pulls numberformat).
 *   BRUNO_INTL_LOCALES   comma list of CLDR locales, or `all` (default `en`)
 *                        e.g. `en,en-GB,de,fr,ja`
 *   BRUNO_INTL_TZ        `golden` | `all` | `none` (default `golden`)
 *                        Time zone data for DateTimeFormat. `golden` covers the
 *                        ~400 most used zones, `all` the full IANA database.
 *
 * Examples:
 *   npm run sandbox:bundle-intl
 *   BRUNO_INTL_LOCALES=all BRUNO_INTL_TZ=all npm run sandbox:bundle-intl
 *   BRUNO_INTL_FEATURES=numberformat,datetimeformat BRUNO_INTL_LOCALES=en,de npm run sandbox:bundle-intl
 */

const OUTPUT_FILE = path.resolve(__dirname, 'bundle-intl-rollup.js');

// Install order matters: each polyfill asserts its dependencies are present.
const FEATURES = {
  pluralrules: { pkg: '@formatjs/intl-pluralrules', deps: [] },
  numberformat: { pkg: '@formatjs/intl-numberformat', deps: ['pluralrules'] },
  datetimeformat: { pkg: '@formatjs/intl-datetimeformat', deps: ['numberformat'] },
  relativetimeformat: { pkg: '@formatjs/intl-relativetimeformat', deps: ['pluralrules', 'numberformat'] },
  listformat: { pkg: '@formatjs/intl-listformat', deps: [] },
  displaynames: { pkg: '@formatjs/intl-displaynames', deps: [] },
  // Tailoring data is built into the polyfill; it has no locale-data directory.
  collator: { pkg: '@formatjs/intl-collator', deps: [], localeData: false }
};
const FEATURE_ORDER = Object.keys(FEATURES);

const parseList = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const resolveFeatures = (requested) => {
  if (requested.includes('all')) {
    return FEATURE_ORDER;
  }
  const selected = new Set();
  const add = (name) => {
    if (!FEATURES[name]) {
      throw new Error(`Unknown Intl feature "${name}". Known: ${FEATURE_ORDER.join(', ')}`);
    }
    FEATURES[name].deps.forEach(add);
    selected.add(name);
  };
  requested.forEach(add);
  return FEATURE_ORDER.filter((name) => selected.has(name));
};

// The packages' `exports` maps hide package.json, so locate them on disk instead.
const listLocaleDataFiles = (pkg) => {
  const dir = path.resolve(__dirname, '../../../../node_modules', pkg);
  return fs
    .readdirSync(path.join(dir, 'locale-data'))
    .filter((file) => file.endsWith('.js'))
    .map((file) => file.slice(0, -3));
};

const localeImports = (pkg, locales) => {
  const available = listLocaleDataFiles(pkg);
  const wanted = locales.includes('all') ? available : locales;
  return wanted
    .map((locale) => {
      if (!available.includes(locale)) {
        console.warn(`[bundle-intl] ${pkg} has no locale data for "${locale}", skipping`);
        return null;
      }
      return `import '${pkg}/locale-data/${locale}.js';`;
    })
    .filter(Boolean)
    .join('\n');
};

const buildEntryCode = ({ features, locales, tz }) => {
  const lines = [
    // Base chain every formatter depends on.
    `import '@formatjs/intl-getcanonicallocales/polyfill-force.js';`,
    `import '@formatjs/intl-locale/polyfill-force.js';`
  ];
  for (const name of features) {
    const { pkg, localeData = true } = FEATURES[name];
    lines.push(`import '${pkg}/polyfill-force.js';`);
    if (localeData) {
      lines.push(localeImports(pkg, locales));
    }
    if (name === 'datetimeformat' && tz !== 'none') {
      lines.push(`import '@formatjs/intl-datetimeformat/add-${tz}-tz.js';`);
    }
  }
  return lines.join('\n');
};

const bundleIntl = async () => {
  const config = {
    features: resolveFeatures(parseList(process.env.BRUNO_INTL_FEATURES, 'all')),
    locales: parseList(process.env.BRUNO_INTL_LOCALES, 'en'),
    tz: process.env.BRUNO_INTL_TZ || 'golden'
  };
  if (!['golden', 'all', 'none'].includes(config.tz)) {
    throw new Error(`BRUNO_INTL_TZ must be golden, all or none (got "${config.tz}")`);
  }

  const entryCode = buildEntryCode(config);

  const bundle = await rollup.rollup({
    input: 'intl-entry',
    plugins: [
      {
        name: 'intl-entry-plugin',
        resolveId: (id) => (id === 'intl-entry' ? id : null),
        load: (id) => (id === 'intl-entry' ? entryCode : null)
      },
      nodeResolve({ preferBuiltins: false, browser: false }),
      commonjs(),
      json(),
      terser()
    ]
  });
  const { output } = await bundle.generate({ format: 'iife', name: 'BrunoIntl' });
  const code = output.map((chunk) => chunk.code).join('\n');

  const manifest = {
    ...config,
    builtAt: new Date().toISOString(),
    bytes: Buffer.byteLength(code)
  };

  fs.writeFileSync(
    OUTPUT_FILE,
    `
      // Generated by \`npm run sandbox:bundle-intl\`. Do not edit.
      const manifest = ${JSON.stringify(manifest, null, 2)};
      const getBundledIntlCode = () => ${JSON.stringify(code)};
      module.exports = { getBundledIntlCode, manifest };
    `
  );
  console.log(`[bundle-intl] wrote ${OUTPUT_FILE}`);
  console.log(`[bundle-intl] ${JSON.stringify(manifest)}`);
};

bundleIntl().catch((error) => {
  console.error('Error while bundling Intl polyfill:', error);
  process.exit(1);
});
