const parse = require('../src/bruToJson');
const stringify = require('../src/jsonToBru');

describe('params:path', () => {
  it('round-trips a disabled path param', () => {
    const input = {
      http: {
        method: 'put',
        url: 'http://example.com/v1/images/:kind'
      },
      params: [
        { name: 'kind', value: 'Logo', type: 'path', enabled: true },
        { name: 'kind', value: 'Signature', type: 'path', enabled: false }
      ]
    };

    const output = stringify(input);

    expect(output).toContain('kind: Logo');
    expect(output).toContain('~kind: Signature');
    expect(parse(output).params).toEqual(input.params);
  });

  it('writes enabled rows before disabled ones so older first-match readers resolve the active value', () => {
    const input = {
      http: {
        method: 'put',
        url: 'http://example.com/v1/images/:kind'
      },
      params: [
        { name: 'kind', value: 'Logo', type: 'path', enabled: false },
        { name: 'kind', value: 'Signature', type: 'path', enabled: true }
      ]
    };

    expect(parse(stringify(input)).params).toEqual([
      { name: 'kind', value: 'Signature', type: 'path', enabled: true },
      { name: 'kind', value: 'Logo', type: 'path', enabled: false }
    ]);
  });

  it('parses a legacy block written before disabled rows were persisted', () => {
    const bru = `put {
  url: http://example.com/v1/items/:id
}

params:path {
  id: 123
}
`;

    expect(parse(bru).params).toEqual([{ name: 'id', value: '123', type: 'path', enabled: true }]);
  });
});
