const fs = require('fs');
const path = require('path');
const ohm = require('ohm-js');

const grammarCache = require('../src/grammar-cache');

// Requiring the package builds every grammar, which registers it with grammar-cache.
require('../../src/index');
require('../src/example/bruToJson');

const grammars = grammarCache.getCompiledGrammars();
const keys = [...grammars.keys()];

const REGENERATE = 'Run: npm run generate:grammars --workspace=packages/bruno-lang';

describe('grammar recipes', () => {
  it('registers every grammar under a unique key', () => {
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter((key, i) => keys.indexOf(key) !== i)).toEqual([]);
  });

  it.each(keys)('has an up-to-date recipe for %s', (key) => {
    const { source, grammar } = grammars.get(key);
    const recipe = grammarCache.readRecipe(key);

    if (!recipe) {
      throw new Error(`No recipe generated for "${key}". ${REGENERATE}`);
    }
    if (recipe.sourceHash !== grammarCache.hashSource(source)) {
      throw new Error(`Recipe for "${key}" is stale. ${REGENERATE}`);
    }
    if (recipe.ohmVersion !== grammarCache.OHM_VERSION) {
      throw new Error(`Recipe for "${key}" was built by ohm-js ${recipe.ohmVersion}. ${REGENERATE}`);
    }

    expect(recipe.grammarName).toBe(grammar.name);
  });

  it.each(keys)('rebuilds %s from its recipe identically to compiling from source', (key) => {
    const { source } = grammars.get(key);
    const fromRecipe = ohm.makeRecipe(grammarCache.readRecipe(key).recipe);

    expect(fromRecipe.toRecipe()).toEqual(ohm.grammar(source).toRecipe());
  });

  it('ships the recipes with the package', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));

    // The recipes live under v2/, so that entry is what puts them in the published tarball.
    expect(manifest.files).toContain('v2');
    expect(path.relative(path.join(__dirname, '..'), grammarCache.GENERATED_DIR)).toBe(path.join('src', 'generated'));
  });

  describe('falling back to compiling from source', () => {
    const tiny = 'Tiny { start = "a" }';

    it('compiles from source when no recipe exists', () => {
      const grammar = grammarCache.compileGrammar('does-not-exist', tiny);

      expect(grammar.name).toBe('Tiny');
      expect(grammar.match('a').succeeded()).toBe(true);
    });

    it('ignores a recipe whose source no longer matches', () => {
      // 'bru' has a real recipe, but not for this source.
      const grammar = grammarCache.compileGrammar('bru', tiny);

      expect(grammar.name).toBe('Tiny');
      expect(grammar.match('a').succeeded()).toBe(true);
    });

    it('hashes line endings alike, so a CRLF checkout still matches its recipe', () => {
      const [key] = keys;
      const { source } = grammars.get(key);

      expect(grammarCache.hashSource(source.replace(/\n/g, '\r\n'))).toBe(grammarCache.hashSource(source));
    });
  });
});
