const { parseBruCollection, stringifyBruCollection } = require('../index');

describe('parseBruCollection — folder tags', () => {
  it('parses tags from a folder.bru meta block, de-duplicating and trimming', () => {
    const bru = `meta {
  name: auth
  seq: 2
  tags: [
    smoke
     regression 
    smoke
  ]
}
`;

    const { meta } = parseBruCollection(bru);

    expect(meta).toEqual({ name: 'auth', seq: 2, tags: ['smoke', 'regression'] });
  });

  it('leaves tags absent when the meta block has none', () => {
    const { meta } = parseBruCollection(`meta {\n  name: auth\n}\n`);

    expect(meta).toEqual({ name: 'auth' });
    expect(meta.tags).toBeUndefined();
  });

  it('drops an inline empty list, which the lang layer surfaces as the string "[]"', () => {
    const { meta } = parseBruCollection(`meta {\n  name: auth\n  tags: []\n}\n`);

    expect(meta).toEqual({ name: 'auth' });
    expect(meta.tags).toBeUndefined();
  });

  it('drops non-string, empty and whitespace-only entries from pre-parsed json', () => {
    const { meta } = parseBruCollection(
      { meta: { name: 'auth', tags: ['  smoke  ', '', '   ', 42, null, { a: 1 }, ['nested'], 'regression'] } },
      true
    );

    expect(meta.tags).toEqual(['smoke', 'regression']);
  });

  it('omits tags when every entry normalizes away', () => {
    const { meta } = parseBruCollection({ meta: { name: 'auth', tags: ['', '   ', 7] } }, true);

    expect(meta).toEqual({ name: 'auth' });
    expect(meta.tags).toBeUndefined();
  });

  it('omits tags when the value is not an array', () => {
    expect(parseBruCollection({ meta: { name: 'auth', tags: 'smoke' } }, true).meta.tags).toBeUndefined();
    expect(parseBruCollection({ meta: { name: 'auth', tags: null } }, true).meta.tags).toBeUndefined();
    expect(parseBruCollection({ meta: { name: 'auth', tags: { smoke: true } } }, true).meta.tags).toBeUndefined();
  });

  it('does not invent a meta block for a collection.bru file that has none', () => {
    const parsed = parseBruCollection(`auth {\n  mode: none\n}\n`);

    expect(parsed.meta).toBeUndefined();
  });
});

describe('stringifyBruCollection — folder tags', () => {
  it('writes normalized tags for a folder and round-trips them', () => {
    const bru = stringifyBruCollection({ meta: { name: 'auth', seq: 2, tags: ['  smoke  ', 'smoke', 'regression'] } }, true);

    expect(bru).toContain('tags: [\n    smoke\n    regression\n  ]');

    const { meta } = parseBruCollection(bru);
    expect(meta).toEqual({ name: 'auth', seq: 2, tags: ['smoke', 'regression'] });
  });

  it('omits tags for a folder that has none, or whose tags all normalize away', () => {
    expect(stringifyBruCollection({ meta: { name: 'auth' } }, true)).not.toContain('tags');
    expect(stringifyBruCollection({ meta: { name: 'auth', tags: [] } }, true)).not.toContain('tags');
    expect(stringifyBruCollection({ meta: { name: 'auth', tags: ['', '  '] } }, true)).not.toContain('tags');
    expect(stringifyBruCollection({ meta: { name: 'auth', tags: 'smoke' } }, true)).not.toContain('tags');
  });

  it('never writes tags for a collection.bru file — tags are folder-only', () => {
    const json = { meta: { name: 'my-collection', tags: ['smoke'] } };

    expect(stringifyBruCollection(json, false)).not.toContain('tags');
    expect(stringifyBruCollection(json)).not.toContain('tags');
  });

  it('leaves the rest of the folder meta block intact when tags are present', () => {
    const bru = stringifyBruCollection(
      { meta: { name: 'auth', seq: 3, tags: ['smoke'] }, request: { headers: [{ name: 'x-api-key', value: 'abc', enabled: true }] } },
      true
    );

    const parsed = parseBruCollection(bru);
    expect(parsed.meta).toEqual({ name: 'auth', seq: 3, tags: ['smoke'] });
    expect(parsed.request.headers).toEqual([{ name: 'x-api-key', value: 'abc', enabled: true }]);
  });
});
