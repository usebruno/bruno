const { ensureNewlineAfterComment, cleanSuggestion, buildSystemPrompt, stripDisallowedApis } = require('./autocomplete-prompts');

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

describe('buildSystemPrompt', () => {
  it('omits the res API block for pre-request', () => {
    const prompt = buildSystemPrompt('pre-request');
    expect(prompt).not.toContain('res:');
    expect(prompt).toContain('bru:');
    expect(prompt).toContain('req:');
  });

  it('includes the res API block for post-response', () => {
    const prompt = buildSystemPrompt('post-response');
    expect(prompt).toContain('res:');
    expect(prompt).toContain('bru:');
    expect(prompt).toContain('req:');
  });

  it('includes res and test/expect for tests', () => {
    const prompt = buildSystemPrompt('tests');
    expect(prompt).toContain('res:');
    expect(prompt).toContain('test/expect:');
  });
});

describe('stripDisallowedApis', () => {
  it('drops a pre-request suggestion that uses res.method()', () => {
    expect(stripDisallowedApis('res.getStatus();', 'pre-request')).toBe('');
  });

  it('drops a pre-request suggestion that uses res() JSONPath form', () => {
    expect(stripDisallowedApis('res(\'data.id\');', 'pre-request')).toBe('');
  });

  it('drops a pre-request suggestion that uses res bracket access', () => {
    expect(stripDisallowedApis('res[\'body\'];', 'pre-request')).toBe('');
  });

  it('leaves a pre-request suggestion using bru untouched', () => {
    expect(stripDisallowedApis('bru.getEnvVar(\'token\');', 'pre-request')).toBe('bru.getEnvVar(\'token\');');
  });

  it('does not flag a variable named result/response in pre-request', () => {
    expect(stripDisallowedApis('const result = bru.getVar("x");', 'pre-request'))
      .toBe('const result = bru.getVar("x");');
    expect(stripDisallowedApis('const response = 1;', 'pre-request')).toBe('const response = 1;');
  });

  it('keeps res usage in post-response', () => {
    expect(stripDisallowedApis('res.getStatus();', 'post-response')).toBe('res.getStatus();');
  });

  it('keeps res usage in tests', () => {
    expect(stripDisallowedApis('expect(res.getStatus()).to.equal(200);', 'tests'))
      .toBe('expect(res.getStatus()).to.equal(200);');
  });

  it('handles empty suggestions', () => {
    expect(stripDisallowedApis('', 'pre-request')).toBe('');
  });
});
