const parser = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');

describe('pair annotations', () => {
  it('inline annotation with string arg', () => {
    const input = `
headers {
  @description('hello') key: value
}
`;
    const output = parser(input);
    expect(output.headers).toEqual([
      { name: 'key', value: 'value', enabled: true, annotations: [{ name: 'description', value: 'hello' }] }
    ]);
  });

  it('above-line annotation', () => {
    const input = `
headers {
  @description('hello')
  key: value
}
`;
    const output = parser(input);
    expect(output.headers).toEqual([
      { name: 'key', value: 'value', enabled: true, annotations: [{ name: 'description', value: 'hello' }] }
    ]);
  });

  it('annotation without args', () => {
    const input = `
headers {
  @string key: value
}
`;
    const output = parser(input);
    expect(output.headers).toEqual([
      { name: 'key', value: 'value', enabled: true, annotations: [{ name: 'string' }] }
    ]);
  });

  it('multiple inline annotations', () => {
    const input = `
headers {
  @string @description('x') key: value
}
`;
    const output = parser(input);
    expect(output.headers).toEqual([
      {
        name: 'key',
        value: 'value',
        enabled: true,
        annotations: [{ name: 'string' }, { name: 'description', value: 'x' }]
      }
    ]);
  });

  it('multiple above-line annotations', () => {
    const input = `
headers {
  @string
  @description('hello')
  key: value
}
`;
    const output = parser(input);
    expect(output.headers).toEqual([
      {
        name: 'key',
        value: 'value',
        enabled: true,
        annotations: [{ name: 'string' }, { name: 'description', value: 'hello' }]
      }
    ]);
  });

  it('mixed above-line and inline annotations', () => {
    const input = `
headers {
  @string
  @description('hello') key: value
}
`;
    const output = parser(input);
    expect(output.headers).toEqual([
      {
        name: 'key',
        value: 'value',
        enabled: true,
        annotations: [{ name: 'string' }, { name: 'description', value: 'hello' }]
      }
    ]);
  });

  it('no annotation — output unchanged (backward compat)', () => {
    const input = `
headers {
  key: value
}
`;
    const output = parser(input);
    expect(output.headers).toEqual([{ name: 'key', value: 'value', enabled: true }]);
    expect(output.headers[0]).not.toHaveProperty('annotations');
  });

  it('disabled pair with annotation', () => {
    const input = `
headers {
  @string ~key: value
}
`;
    const output = parser(input);
    expect(output.headers).toEqual([
      { name: 'key', value: 'value', enabled: false, annotations: [{ name: 'string' }] }
    ]);
  });

  it('double-quoted annotation arg', () => {
    const input = `
headers {
  @description("hello") key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: 'hello' }]);
  });

  it('unquoted annotation arg', () => {
    const input = `
headers {
  @version(2) key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'version', value: '2' }]);
  });

  it('annotation on params:query block', () => {
    const input = `
params:query {
  @string q: search
}
`;
    const output = parser(input);
    expect(output.params).toEqual([
      { name: 'q', value: 'search', enabled: true, type: 'query', annotations: [{ name: 'string' }] }
    ]);
  });

  it('annotation on vars:pre-request block', () => {
    const input = `
vars:pre-request {
  @description('base url') myVar: http://localhost
}
`;
    const output = parser(input);
    expect(output.vars.req).toEqual([
      {
        name: 'myVar',
        value: 'http://localhost',
        enabled: true,
        local: false,
        annotations: [{ name: 'description', value: 'base url' }]
      }
    ]);
  });

  it('roundtrip: bru → json → bru → json equal', () => {
    const input = `get {
  url: https://example.com
}

headers {
  @description('Content type') content-type: application/json
  @string ~accept: */*
}
`;
    const json1 = parser(input);
    const bru = jsonToBru(json1);
    const json2 = parser(bru);
    expect(json2.headers).toEqual(json1.headers);
  });

  it('serializeAnnotations — annotation without value', () => {
    const json = {
      meta: { name: 'test', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://example.com' },
      headers: [{ name: 'x-key', value: 'val', enabled: true, annotations: [{ name: 'string' }] }]
    };
    const bru = jsonToBru(json);
    expect(bru).toContain('@string x-key: val');
  });

  it('serializeAnnotations — annotation with value', () => {
    const json = {
      meta: { name: 'test', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://example.com' },
      headers: [
        { name: 'x-key', value: 'val', enabled: true, annotations: [{ name: 'description', value: 'my header' }] }
      ]
    };
    const bru = jsonToBru(json);
    expect(bru).toContain('@description(\'my header\') x-key: val');
  });

  it('serializeAnnotations — disabled pair with annotation', () => {
    const json = {
      meta: { name: 'test', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://example.com' },
      headers: [{ name: 'x-key', value: 'val', enabled: false, annotations: [{ name: 'string' }] }]
    };
    const bru = jsonToBru(json);
    expect(bru).toContain('@string ~x-key: val');
  });
});
