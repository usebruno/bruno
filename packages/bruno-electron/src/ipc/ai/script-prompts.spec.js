const { parseDecline, stripCodeFences, DECLINE_PREFIX, buildScriptSystemPrompt } = require('./script-prompts');

describe('parseDecline', () => {
  it('returns null for normal generated code', () => {
    expect(parseDecline('test("status", function() {});')).toBeNull();
    expect(parseDecline('<div>app</div>')).toBeNull();
    expect(parseDecline('')).toBeNull();
    expect(parseDecline(null)).toBeNull();
  });

  it('extracts the reason from a decline line', () => {
    expect(parseDecline(`${DECLINE_PREFIX} This is not related to the API.`))
      .toBe('This is not related to the API.');
  });

  it('tolerates surrounding whitespace and code fences', () => {
    expect(parseDecline(`\n\`\`\`\n${DECLINE_PREFIX} Run the request first.\n\`\`\`\n`))
      .toBe('Run the request first.');
  });

  it('only reads the first line of the reason', () => {
    expect(parseDecline(`${DECLINE_PREFIX} Off topic.\nconst x = 1;`)).toBe('Off topic.');
  });

  it('falls back to a generic reason when the sentinel is bare', () => {
    expect(parseDecline(`${DECLINE_PREFIX}`)).toBe('This request is outside what can be generated here.');
  });

  it('does not fire when the sentinel appears mid-content', () => {
    expect(parseDecline(`const note = "${DECLINE_PREFIX} nope";`)).toBeNull();
  });
});

describe('buildScriptSystemPrompt', () => {
  it('includes the decline rule for every script type', () => {
    for (const type of ['tests', 'pre-request', 'post-response', 'docs', 'app-request', 'app-collection']) {
      expect(buildScriptSystemPrompt(type)).toContain(DECLINE_PREFIX);
    }
  });
});

describe('stripCodeFences', () => {
  it('still strips fences and preambles', () => {
    expect(stripCodeFences('```js\nconst a = 1;\n```')).toBe('const a = 1;');
  });
});
