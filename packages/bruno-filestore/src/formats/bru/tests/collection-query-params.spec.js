const { parseBruCollection, stringifyBruCollection } = require('../index');

describe('parseBruCollection — collection/folder query params (issue #9553)', () => {
  it('parses a `query {}` block into request.params tagged as type query', () => {
    const bru = `query {
  pageSize: 20
  format: json
}
`;
    const parsed = parseBruCollection(bru);
    expect(parsed.request.params).toEqual([
      { name: 'pageSize', value: '20', enabled: true, type: 'query' },
      { name: 'format', value: 'json', enabled: true, type: 'query' }
    ]);
  });

  it('marks `~`-prefixed entries as disabled', () => {
    const bru = `query {
  pageSize: 20
  ~format: json
}
`;
    const parsed = parseBruCollection(bru);
    expect(parsed.request.params).toEqual([
      { name: 'pageSize', value: '20', enabled: true, type: 'query' },
      { name: 'format', value: 'json', enabled: false, type: 'query' }
    ]);
  });

  it('leaves request.params empty when there is no query block', () => {
    const parsed = parseBruCollection(`headers {\n  x-a: b\n}\n`);
    expect(parsed.request.params).toEqual([]);
  });

  it('keeps query values with {{variables}} intact for send-time interpolation', () => {
    const parsed = parseBruCollection(`query {\n  token: {{apiToken}}\n}\n`);
    expect(parsed.request.params).toEqual([
      { name: 'token', value: '{{apiToken}}', enabled: true, type: 'query' }
    ]);
  });
});

describe('stringifyBruCollection — collection/folder query params (issue #9553)', () => {
  it('writes request.params back into a `query {}` block', () => {
    const bru = stringifyBruCollection({
      request: {
        params: [
          { name: 'pageSize', value: '20', enabled: true, type: 'query' },
          { name: 'format', value: 'json', enabled: false, type: 'query' }
        ],
        headers: []
      }
    });
    expect(bru).toContain('query {');
    expect(bru).toContain('pageSize: 20');
    expect(bru).toContain('~format: json');
  });

  it('omits the query block when there are no query params', () => {
    const bru = stringifyBruCollection({ request: { params: [], headers: [] } });
    expect(bru).not.toContain('query {');
  });

  it('does not leak path params into the query block', () => {
    const bru = stringifyBruCollection({
      request: {
        params: [{ name: 'id', value: '1', enabled: true, type: 'path' }],
        headers: []
      }
    });
    expect(bru).not.toContain('query {');
  });

  it('round-trips a hand-edited collection.bru without losing the query block', () => {
    const original = `query {
  pageSize: 20
  ~format: json
}

headers {
  x-a: b
}
`;
    const parsed = parseBruCollection(original);
    const restringified = stringifyBruCollection(parsed);
    const reparsed = parseBruCollection(restringified);
    expect(reparsed.request.params).toEqual(parsed.request.params);
  });
});
