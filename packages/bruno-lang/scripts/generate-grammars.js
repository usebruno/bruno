#!/usr/bin/env node

/**
 * Regenerates the ohm grammar recipes consumed by v2/src/grammar-cache.js.
 *
 *   npm run generate:grammars --workspace=packages/bruno-lang
 *
 * Run it after editing any grammar. Without it the edited grammar still parses correctly -
 * grammar-cache falls back to compiling from source when the recipe no longer matches - it is just
 * ~15ms slower to load, and grammar-cache.spec.js fails until the recipe is refreshed.
 */

const fs = require('fs');
const path = require('path');
const ohm = require('ohm-js');

const { getCompiledGrammars, hashSource, recipePath, GENERATED_DIR, OHM_VERSION } = require('../v2/src/grammar-cache');

// Requiring the package builds every grammar, which registers it with grammar-cache. Any grammar
// reachable from neither entry point below would get no recipe, so grammar-cache.spec.js checks every
// registered grammar has one rather than trusting this list.
require('../src/index');
require('../v2/src/example/bruToJson');

const grammars = getCompiledGrammars();

if (grammars.size === 0) {
  console.error('No grammars were registered - did the grammar modules stop using compileGrammar()?');
  process.exit(1);
}

fs.mkdirSync(GENERATED_DIR, { recursive: true });

for (const [key, { source }] of grammars) {
  // Compile from source rather than reusing what grammar-cache handed back, so regenerating is
  // deterministic whether or not a usable recipe already existed.
  const grammar = ohm.grammar(source);

  // toRecipe() returns stringified JSON. Store it parsed, so the committed file is real JSON rather
  // than one escape-doubled string, but keep it on a single line: these files are generated, and
  // pretty-printing them triples their size for no reader.
  const lines = [
    '{',
    '  "generatedBy": "scripts/generate-grammars.js",',
    `  "grammarName": ${JSON.stringify(grammar.name)},`,
    `  "ohmVersion": ${JSON.stringify(OHM_VERSION)},`,
    `  "sourceHash": ${JSON.stringify(hashSource(source))},`,
    `  "recipe": ${JSON.stringify(JSON.parse(grammar.toRecipe()))}`,
    '}'
  ];

  fs.writeFileSync(recipePath(key), `${lines.join('\n')}\n`);
  console.log(`wrote ${key}.json (${grammar.name})`);
}

// A recipe with no matching grammar is dead weight, but deleting it here would also remove one whose
// grammar is simply not reachable from the entry points above, so report instead of guessing.
const orphaned = fs
  .readdirSync(GENERATED_DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => path.basename(file, '.json'))
  .filter((key) => !grammars.has(key));

if (orphaned.length) {
  console.log(`\nNo grammar claimed these recipes: ${orphaned.join(', ')}`);
  console.log('Delete them if their grammar is gone, or check why it is no longer being built.');
}

console.log(`\nWrote ${grammars.size} recipes for ohm-js ${OHM_VERSION}`);
