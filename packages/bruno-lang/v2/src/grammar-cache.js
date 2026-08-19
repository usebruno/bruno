/**
 * Compiling a PEG grammar from source costs ~10-25ms, and every grammar in this package is built at
 * module load. Together they add ~90ms to `require('@usebruno/lang')`, which the CLI pays on every
 * invocation and every consumer of @usebruno/filestore pays on import.
 *
 * ohm can serialize an already-compiled grammar to a "recipe" that rebuilds in well under a
 * millisecond, so we prefer a pre-generated recipe and fall back to compiling from source.
 *
 * A recipe is used only when it still describes the grammar in front of us: it has to come from this
 * ohm-js version, record the hash of this source, and embed this source verbatim. Anything else -
 * an edited grammar, an ohm upgrade, a corrupt or mismatched file - falls back to compiling, so a
 * stale recipe is only ever slower, never wrong. `npm run generate:grammars` refreshes them, and
 * grammar-cache.spec.js fails if they drift.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ohm = require('ohm-js');

const GENERATED_DIR = path.join(__dirname, 'generated');

// A recipe rebuilt by a different ohm-js may be structurally valid yet subtly different, and
// Builder.fromRecipe only throws on operations it does not recognise.
const OHM_VERSION = require('ohm-js/package.json').version;

// A CRLF checkout compiles to the same grammar, so it should not throw the recipe away.
const withUnixNewlines = (source) => source.replace(/\r\n/g, '\n');

const hashSource = (source) => crypto.createHash('sha256').update(withUnixNewlines(source)).digest('hex');

const recipePath = (key) => path.join(GENERATED_DIR, `${key}.json`);

const readRecipe = (key) => {
  try {
    return JSON.parse(fs.readFileSync(recipePath(key), 'utf8'));
  } catch {
    // No recipe generated yet, or it is unreadable - the caller compiles from source.
    return null;
  }
};

/**
 * ohm embeds the grammar source in the recipe, so the payload can be checked against the source it
 * claims to describe. The hash alone would not catch a recipe body swapped between two files by a bad
 * merge, and the recorded grammar name would not either - three of these grammars are called `Bru`.
 */
const describesSource = (cached, source) => {
  const embedded = cached.recipe && cached.recipe[1] && cached.recipe[1].source;
  return typeof embedded === 'string' && withUnixNewlines(embedded) === withUnixNewlines(source);
};

const isUsable = (cached, source) =>
  Boolean(cached)
  && cached.ohmVersion === OHM_VERSION
  && cached.sourceHash === hashSource(source)
  && describesSource(cached, source);

// Every grammar built so far, keyed as it is under generated/. The generator and the drift test read
// this instead of keeping their own copies of the source strings.
const compiled = new Map();

const compileGrammar = (key, source) => {
  const cached = readRecipe(key);
  let grammar = null;

  if (isUsable(cached, source)) {
    try {
      grammar = ohm.makeRecipe(cached.recipe);
    } catch {
      // This ohm-js cannot rebuild the recipe - compile from source instead.
    }
  }

  if (!grammar) {
    grammar = ohm.grammar(source);
  }

  compiled.set(key, { source, grammar });
  return grammar;
};

/** The grammars this package has built, for the generator script and the drift test. */
const getCompiledGrammars = () => new Map(compiled);

module.exports = {
  compileGrammar,
  getCompiledGrammars,
  hashSource,
  readRecipe,
  recipePath,
  GENERATED_DIR,
  OHM_VERSION
};
