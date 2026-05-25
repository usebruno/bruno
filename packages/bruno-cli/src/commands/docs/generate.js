'use strict';
/**
 * packages/bruno-cli/src/commands/docs/generate.js
 *
 * Implements `bru docs generate <collection-path>`.
 *
 * Pipeline:
 *   1. Validate the collection path
 *   2. Load & parse the collection (OpenCollection YAML or .bru)
 *   3. Build a single OpenCollection YAML string
 *   4. Render the HTML file embedding that YAML + CDN viewer
 *   5. Write output and print summary
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadCollection } = require('../../docs/load-collection');
const { buildYaml, validateYaml } = require('../../docs/build-yaml');
const { renderHtml } = require('../../docs/render-html');
const { resolveOutput, assertCollectionRoot, ensureDir } = require('../../docs/fs-helpers');
const { EXIT_STATUS } = require('../../constants');

// ── Command definition (yargs API) ────────────────────────────────────────────

exports.command = 'generate <collection>';
exports.describe = 'Generate an HTML documentation file from a Bruno collection';

exports.builder = (yargs) => {
  return yargs
    .positional('collection', {
      describe: 'Path to the Bruno collection folder',
      type: 'string'
    })
    .option('output', {
      alias: 'o',
      describe: 'Path for the generated HTML file',
      type: 'string',
      default: 'docs/index.html'
    })
    .option('title', {
      alias: 't',
      describe: 'Override the collection name shown in the docs',
      type: 'string'
    })
    .option('theme', {
      describe: 'Viewer theme',
      type: 'string',
      choices: ['light', 'dark'],
      default: 'light'
    })
    .option('git-url', {
      describe: 'URL of the Git repository (shown in the viewer)',
      type: 'string'
    })
    .example(
      '$0 docs generate ./my-api --output docs/index.html --theme dark',
      'Generate dark-themed docs for ./my-api'
    )
    .example(
      '$0 docs generate ./my-api --title "My API" --git-url https://github.com/org/repo',
      'Generate docs with a custom title and Git link'
    );
};

exports.handler = async (argv) => {
  const collectionDir = path.resolve(argv.collection);
  const outputPath = resolveOutput(argv.output);

  const theme = argv.theme;
  const gitUrl = argv['git-url'] || '';
  const titleOverride = argv.title || null;

  // ── Step 1: validate collection path ──────────────────────────────────────
  try {
    assertCollectionRoot(collectionDir);
  } catch (err) {
    console.error(chalk.red(`\n  ${err.message}\n`));
    process.exit(EXIT_STATUS.ERROR_FILE_NOT_FOUND);
  }

  console.log(chalk.dim(`\n  Reading collection: ${collectionDir}`));

  // ── Step 2: load & parse collection ───────────────────────────────────────
  let collection;
  try {
    collection = loadCollection(collectionDir, { titleOverride });
  } catch (err) {
    console.error(chalk.red(`\n  Failed to parse collection: ${err.message}\n`));
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(EXIT_STATUS.ERROR_INVALID_FILE);
  }

  const { requests, folders } = countItems(collection.items);
  console.log(
    chalk.green(`  ${collection.info.name}`)
    + chalk.dim(` — ${requests} requests, ${folders} folders, ${collection.environments.length} environments`)
  );

  // ── Step 3: build OpenCollection YAML ─────────────────────────────────────
  let yamlString;
  try {
    yamlString = buildYaml(collection);
  } catch (err) {
    console.error(chalk.red(`\n  Failed to build YAML: ${err.message}\n`));
    process.exit(EXIT_STATUS.ERROR_INVALID_FILE);
  }

  const { valid, error: yamlError } = validateYaml(yamlString);
  if (!valid) {
    console.error(chalk.yellow(`\n  Warning: generated YAML failed validation: ${yamlError}`));
    console.error(chalk.yellow('  The output HTML may not render correctly.\n'));
  }

  // ── Step 4: render HTML ────────────────────────────────────────────────────
  const html = renderHtml({
    title: collection.info.name,
    yamlString,
    theme,
    gitUrl
  });

  // ── Step 5: write output ───────────────────────────────────────────────────
  try {
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, html, 'utf8');
  } catch (err) {
    console.error(chalk.red(`\n  Failed to write output file: ${err.message}\n`));
    process.exit(EXIT_STATUS.ERROR_GENERIC);
  }

  const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(chalk.green(`\n  Documentation generated: ${outputPath}`));
  console.log(chalk.dim(`  Size: ${sizeKb} KB  •  YAML: ${(Buffer.byteLength(yamlString, 'utf8') / 1024).toFixed(1)} KB\n`));
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function countItems(items, acc = { requests: 0, folders: 0 }) {
  for (const item of items) {
    if (item.type === 'folder') {
      acc.folders++;
      countItems(item.items || [], acc);
    } else {
      acc.requests++;
    }
  }
  return acc;
}

if (require.main === module) {
  const argv = require('yargs/yargs')(process.argv.slice(2))
    .option('output', { type: 'string', default: 'docs/index.html' })
    .option('title', { type: 'string' })
    .option('theme', { type: 'string', default: 'light' })
    .option('git-url', { type: 'string' })
    .parse();

  exports.handler({
    'collection': argv._[0],
    'output': argv.output,
    'title': argv.title,
    'theme': argv.theme,
    'git-url': argv['git-url']
  }).catch((err) => {
    console.error(chalk.red(err.message));
    process.exit(EXIT_STATUS.ERROR_GENERIC);
  });
}
