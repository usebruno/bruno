import {
  appendSnippet,
  buildAccessor,
  generatePostResponseSnippet,
  generateTestSnippet,
  getResponseJsonPath,
  variableNameForSegments
} from './responseJsonToScript';

// Fixtures mirroring react-json-view's real rendered DOM (verified against
// the rendered output): leaf values are `.variable-row` nodes; objects and
// arrays are `.object-key-val` containers whose key lives in the brace span
// (`:scope > span > span > span > .object-key` or `.array-key`); children
// render inside the container's `.pushed-content` block.
const objectKeyHtml = (key) =>
  `<span class="object-key"><span>"</span><span>${key}</span><span>"</span></span><span>:</span>`;
const arrayKeyHtml = (index) => `<span class="array-key">${index}</span><span>:</span>`;

// Leaf rows. For leaf array items react-json-view nests the colon inside
// the array-key span; for leaf object properties the key is a nested
// `.object-key` span.
const leafObjectRow = (key, valueHtml = '') => `
  <div class="variable-row">
    <span>${objectKeyHtml(key)}</span>
    <div class="variable-value">${valueHtml}</div>
  </div>`;
const leafArrayRow = (index, valueHtml = '') => `
  <div class="variable-row">
    <span class="array-key">${index}<div>:</div></span>
    <div class="variable-value">${valueHtml}</div>
  </div>`;

// A container node (object or array) with children.
const containerNode = (keyHtml, childrenHtml, openBrace = '{', closeBrace = '}') => `
  <div class="object-key-val">
    <span>
      <span>
        <div class="icon-container"></div>
        <span>${keyHtml}</span>
        <span>${openBrace}</span>
      </span>
      <div class="object-meta-data"></div>
    </span>
    <div class="pushed-content object-container">
      <div class="object-content">${childrenHtml}</div>
    </div>
    <span class="brace-row"><span>${closeBrace}</span></span>
  </div>`;

const objectNode = (key, childrenHtml) => containerNode(objectKeyHtml(key), childrenHtml, '{', '}');
const arrayNode = (key, childrenHtml) => containerNode(objectKeyHtml(key), childrenHtml, '[', ']');
const arrayItemNode = (index, childrenHtml) => containerNode(arrayKeyHtml(index), childrenHtml, '{', '}');

// The root container renders with an empty key span (`name={false}`).
const rootNode = (childrenHtml) => containerNode('', childrenHtml, '{', '}');

const mount = (html) => {
  document.body.innerHTML = `<div class="pretty-json-container object-container"><div class="object-content">${html}</div></div>`;
  return document.body;
};

describe('getResponseJsonPath', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves a nested object path from the clicked value', () => {
    const body = mount(
      rootNode(objectNode('properties', leafObjectRow('latestReportId', '<span class="string-value">"abc"</span>')))
    );
    const target = body.querySelector('.string-value');
    expect(getResponseJsonPath(target)).toEqual(['properties', 'latestReportId']);
  });

  it('resolves a top-level path', () => {
    const body = mount(rootNode(leafObjectRow('status', '<span class="string-value">"ok"</span>')));
    expect(getResponseJsonPath(body.querySelector('.string-value'))).toEqual(['status']);
  });

  it('resolves array indices as numbers', () => {
    const body = mount(
      rootNode(arrayNode('items', leafArrayRow(0, '<span class="number-value">1</span>')))
    );
    expect(getResponseJsonPath(body.querySelector('.number-value'))).toEqual(['items', 0]);
  });

  it('resolves a path through a mixed object/array nest', () => {
    const body = mount(
      rootNode(
        objectNode(
          'data',
          objectNode('users', arrayItemNode(1, leafObjectRow('name', '<span class="string-value">"ada"</span>')))
        )
      )
    );
    expect(getResponseJsonPath(body.querySelector('.string-value'))).toEqual(['data', 'users', 1, 'name']);
  });

  it('resolves a path when right-clicking a container node itself', () => {
    const body = mount(rootNode(objectNode('properties', leafObjectRow('latestReportId'))));
    const keyEl = Array.from(body.querySelectorAll('.object-key')).find((el) =>
      el.textContent.includes('properties')
    );
    expect(getResponseJsonPath(keyEl)).toEqual(['properties']);
  });

  it('resolves a path when right-clicking the key label of a leaf', () => {
    const body = mount(rootNode(leafObjectRow('token')));
    const keyEl = body.querySelector('.object-key');
    expect(getResponseJsonPath(keyEl)).toEqual(['token']);
  });

  it('resolves a real key named "false"', () => {
    const body = mount(rootNode(leafObjectRow('false', '<span class="string-value">"x"</span>')));
    expect(getResponseJsonPath(body.querySelector('.string-value'))).toEqual(['false']);
  });

  it('returns null outside the JSON tree', () => {
    const body = mount(rootNode(leafObjectRow('token')));
    expect(getResponseJsonPath(body)).toBeNull();
    expect(getResponseJsonPath(null)).toBeNull();
  });
});

describe('buildAccessor', () => {
  it('uses dot notation for identifiers', () => {
    expect(buildAccessor(['properties', 'latestReportId'])).toBe('responseBody.properties.latestReportId');
  });

  it('uses bracket notation for array indices', () => {
    expect(buildAccessor(['items', 0, 'id'])).toBe('responseBody.items[0].id');
  });

  it('brackets keys that are not valid identifiers', () => {
    expect(buildAccessor(['weird key', 'a.b'])).toBe('responseBody["weird key"]["a.b"]');
  });

  it('escapes quotes inside bracketed keys', () => {
    expect(buildAccessor(['say "hi"'])).toBe('responseBody["say \\"hi\\""]');
  });

  it('quotes digit-only string keys instead of using bare brackets', () => {
    // Bare [007] would read key "7" in sloppy mode and is a SyntaxError in
    // strict mode; only real array indices (numbers) get bare brackets.
    expect(buildAccessor(['007'])).toBe('responseBody["007"]');
  });
});

describe('variableNameForSegments', () => {
  it('takes the last segment and camelCases it', () => {
    expect(variableNameForSegments(['properties', 'latestReportId'])).toBe('latestReportId');
    expect(variableNameForSegments(['user-id'])).toBe('userId');
  });

  it('skips trailing array indices', () => {
    expect(variableNameForSegments(['items', 0])).toBe('items');
  });

  it('falls back to "value" when nothing usable remains', () => {
    expect(variableNameForSegments([0])).toBe('value');
  });
});

describe('generatePostResponseSnippet', () => {
  it('generates a self-contained block', () => {
    expect(generatePostResponseSnippet(['properties', 'latestReportId'])).toBe(
      [
        '{',
        '  const responseBody = res.getBody();',
        '  bru.setVar("latestReportId", responseBody.properties.latestReportId); // generated from the response JSON',
        '}'
      ].join('\n')
    );
  });

  it('brackets unsafe segments in the accessor', () => {
    const snippet = generatePostResponseSnippet(['weird key', 0]);
    expect(snippet).toContain('bru.setVar("weirdKey", responseBody["weird key"][0]);');
  });

  it('does not emit duplicate declarations when appended twice', () => {
    const combined = appendSnippet(
      appendSnippet('', generatePostResponseSnippet(['a'])),
      generatePostResponseSnippet(['b'])
    );
    expect(combined).not.toMatch(/function onResponse/);
    expect(combined).toContain('bru.setVar("a", responseBody.a);');
    expect(combined).toContain('bru.setVar("b", responseBody.b);');
    // The combined script must parse: no duplicate declarations, no syntax errors.
    expect(() => new Function(combined)).not.toThrow();
  });
});

describe('generateTestSnippet', () => {
  it('asserts primitive values with to.equal', () => {
    expect(generateTestSnippet(['properties', 'latestReportId'], 'abc123')).toBe(
      [
        'test("should have latestReportId in the response", function() {',
        '  let responseBody = res.getBody();',
        '  expect(responseBody.properties.latestReportId).to.equal("abc123");',
        '});'
      ].join('\n')
    );
  });

  it('asserts objects with deep equality', () => {
    const snippet = generateTestSnippet(['user'], { name: 'Ada' });
    expect(snippet).toContain('expect(responseBody.user).to.eql({"name":"Ada"});');
  });

  it('handles null and boolean values', () => {
    expect(generateTestSnippet(['active'], true)).toContain('.to.equal(true);');
    expect(generateTestSnippet(['deleted'], null)).toContain('.to.equal(null);');
  });

  it('escapes the test title', () => {
    const snippet = generateTestSnippet(['say "hi"'], 'x');
    expect(snippet).toContain('test("should have say \\"hi\\" in the response", function() {');
    expect(() => new Function(snippet)).not.toThrow();
  });
});

describe('appendSnippet', () => {
  it('returns the snippet when there is no existing content', () => {
    expect(appendSnippet('', 'snippet')).toBe('snippet');
    expect(appendSnippet(undefined, 'snippet')).toBe('snippet');
  });

  it('separates blocks with a blank line', () => {
    expect(appendSnippet('existing();', 'snippet')).toBe('existing();\n\nsnippet');
  });

  it('trims trailing whitespace of the existing content', () => {
    expect(appendSnippet('existing();\n\n', 'snippet')).toBe('existing();\n\nsnippet');
  });
});
