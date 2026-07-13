const { ensureNewlineAfterComment, cleanSuggestion } = require('./autocomplete-prompts');

describe('ensureNewlineAfterComment', () => {
  it('prepends a newline when code is suggested at the end of a comment line', () => {
    const prefix = 'const a = 1;\n// test that status is 200';
    const out = ensureNewlineAfterComment(prefix, 'test("status is 200", function() {');
    expect(out).toBe('\ntest("status is 200", function() {');
  });

  it('handles trailing comments after code on the same line', () => {
    const prefix = 'doWork(); // then save the token';
    expect(ensureNewlineAfterComment(prefix, 'bru.setEnvVar(\'token\', res(\'data.token\'));'))
      .toBe('\nbru.setEnvVar(\'token\', res(\'data.token\'));');
  });

  it('leaves prose continuations of the comment untouched', () => {
    const prefix = '// test that the response';
    expect(ensureNewlineAfterComment(prefix, ' body contains a user id'))
      .toBe(' body contains a user id');
  });

  it('leaves suggestions that already start with a newline untouched', () => {
    const prefix = '// add a status assertion';
    expect(ensureNewlineAfterComment(prefix, '\nexpect(res.getStatus()).to.equal(200);'))
      .toBe('\nexpect(res.getStatus()).to.equal(200);');
  });

  it('does nothing on ordinary code lines', () => {
    const prefix = 'const token = ';
    expect(ensureNewlineAfterComment(prefix, 'bru.getEnvVar(\'token\');'))
      .toBe('bru.getEnvVar(\'token\');');
  });

  it('ignores // inside string literals (URLs)', () => {
    const prefix = 'req.setUrl(\'https://api.example.com\');';
    expect(ensureNewlineAfterComment(prefix, 'req.setHeader("Accept", "application/json");'))
      .toBe('req.setHeader("Accept", "application/json");');
  });

  it('handles empty suggestions', () => {
    expect(ensureNewlineAfterComment('// hi', '')).toBe('');
  });
});

describe('cleanSuggestion', () => {
  it('keeps indentation while stripping fences', () => {
    expect(cleanSuggestion('```js\n  const a = 1;\n```')).toBe('  const a = 1;');
  });
});
