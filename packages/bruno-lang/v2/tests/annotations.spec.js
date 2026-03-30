const parser = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');
const fs = require('fs');
const path = require('path');

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

  it('inline annotations in asserts', () => {
    const input = `
assert {
  @description('hello') res.status: eq 200
}
`;
    const output = parser(input);
    expect(output.assertions).toEqual([
      { name: 'res.status', value: 'eq 200', enabled: true, annotations: [{ name: 'description', value: 'hello' }] }
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

  it('single quote inside double-quoted annotation arg (e.g. O\'Reilly)', () => {
    const input = `
headers {
  @description("O'Reilly") key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: 'O\'Reilly' }]);
  });

  it('double quote inside single-quoted annotation arg (e.g. say "hello")', () => {
    const input = `
headers {
  @description('say "hello"') key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: 'say "hello"' }]);
  });

  it('smoke test escaping special characters', () => {
    const input = fs.readFileSync(path.join(__dirname, './fixtures/annotations.bru'));
    const output = parser(input);
    expect(output.vars.req[0].annotations).toEqual([{ name: 'description', value: 'found in C:\\Users\\File\\Path' }]);
    expect(output.vars.req[1].annotations).toEqual([{ name: 'description', value: 'height of 2\' ' }]);
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

  it('float (decimal) unquoted annotation arg', () => {
    const input = `
headers {
  @version(3.14) key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'version', value: '3.14' }]);
  });

  it('empty string arg', () => {
    const input = `
headers {
  @description('') key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: '' }]);
  });

  it('whitespace-only string arg preserves spaces', () => {
    const input = `
headers {
  @description('   ') key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: '   ' }]);
  });

  it('leading and trailing whitespace in string arg is preserved', () => {
    const input = `
headers {
  @description('  hello  ') key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: '  hello  ' }]);
  });

  it('unicode characters in annotation arg', () => {
    const input = `
headers {
  @description('日本語') key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: '日本語' }]);
  });

  it('URL with query string in annotation arg', () => {
    const input = `
headers {
  @description('https://example.com/path?q=1&r=2#anchor') key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: 'https://example.com/path?q=1&r=2#anchor' }]);
  });

  it('colon inside annotation arg value', () => {
    const input = `
headers {
  @description('Content-Type: application/json') key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: 'Content-Type: application/json' }]);
  });

  it('email address (@ symbol) inside annotation arg value', () => {
    const input = `
headers {
  @description('user@example.com') key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: 'user@example.com' }]);
  });

  it('template variable syntax inside annotation arg value', () => {
    const input = `
headers {
  @description('{{baseUrl}}/endpoint') key: value
}
`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: '{{baseUrl}}/endpoint' }]);
  });

  it('tab character inside annotation arg value', () => {
    const input = `headers {\n  @description('col1\tcol2') key: value\n}\n`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: 'col1\tcol2' }]);
  });

  it('multiline string values', () => {
    const input = `headers { 
  @description('''
    make it rain
    make it rain2
  ''') 
  key: value
}`;
    const output = parser(input);
    expect(output.headers[0].annotations).toEqual([{ name: 'description', value: 'make it rain\nmake it rain2' }]);
  });

  it('serializeAnnotations — multiline value uses triple-quote delimiters and roundtrips correctly', () => {
    const json = {
      meta: { name: 'test', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://example.com' },
      headers: [{ name: 'x-key', value: 'val', enabled: true, annotations: [{ name: 'description', value: 'line one\nline two' }] }]
    };
    const bru = jsonToBru(json);
    expect(bru).toContain('@description(\'\'\'\n    line one\n    line two\n  \'\'\') x-key: val'); const parsed = parser(bru);
    expect(parsed.headers[0].annotations).toEqual([{ name: 'description', value: 'line one\nline two' }]);
  });

  it('serializeAnnotations — empty string value roundtrips correctly', () => {
    const json = {
      meta: { name: 'test', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://example.com' },
      headers: [{ name: 'x-key', value: 'val', enabled: true, annotations: [{ name: 'description', value: '' }] }]
    };
    const bru = jsonToBru(json);
    const parsed = parser(bru);
    expect(parsed.headers[0].annotations).toEqual([{ name: 'description', value: '' }]);
  });

  it('serializeAnnotations — URL with special chars uses single-quote delimiters', () => {
    const json = {
      meta: { name: 'test', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://example.com' },
      headers: [{ name: 'x-key', value: 'val', enabled: true, annotations: [{ name: 'description', value: 'https://example.com?q=1&r=2' }] }]
    };
    const bru = jsonToBru(json);
    expect(bru).toContain('@description(\'https://example.com?q=1&r=2\') x-key: val');
  });

  it('serializeAnnotations — template variable in value roundtrips correctly', () => {
    const json = {
      meta: { name: 'test', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://example.com' },
      headers: [{ name: 'x-key', value: 'val', enabled: true, annotations: [{ name: 'description', value: '{{baseUrl}}/path' }] }]
    };
    const bru = jsonToBru(json);
    const parsed = parser(bru);
    expect(parsed.headers[0].annotations).toEqual([{ name: 'description', value: '{{baseUrl}}/path' }]);
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

  it('serializeAnnotations — value with single quote uses double-quote delimiters (e.g. O\'Reilly)', () => {
    const json = {
      meta: { name: 'test', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://example.com' },
      headers: [{ name: 'x-key', value: 'val', enabled: true, annotations: [{ name: 'description', value: 'O\'Reilly' }] }]
    };
    const bru = jsonToBru(json);
    expect(bru).toContain('@description("O\'Reilly") x-key: val');
  });

  it('serializeAnnotations — value with double quote uses single-quote delimiters (e.g. say "hello")', () => {
    const json = {
      meta: { name: 'test', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://example.com' },
      headers: [{ name: 'x-key', value: 'val', enabled: true, annotations: [{ name: 'description', value: 'say "hello"' }] }]
    };
    const bru = jsonToBru(json);
    expect(bru).toContain('@description(\'say "hello"\') x-key: val');
  });

  it('parseAndSerialise - bru sourced roundtrip check - headers', () => {
    const input = `headers {
  @description('hello') key: value
}
`;
    const parsed = parser(input);
    const output = jsonToBru(parsed);

    expect(input).toEqual(output);
  });

  it('parseAndSerialise - json sourced roundtrip check - headers', () => {
    const input = {
      headers: [{ name: 'x-key', value: 'val', enabled: true, annotations: [{ name: 'description', value: 'say "hello"' }] }]
    };
    const stringified = jsonToBru(input);
    const output = parser(stringified);

    expect(input).toEqual(output);
  });

  it('parseAndSerialise - bru sourced roundtrip check - asserts', () => {
    const input = `assert {
  @description('make it rain') res.status: eq 200
}
`;

    const parsed = parser(input);
    const output = jsonToBru(parsed);

    expect(input).toEqual(output);
  });

  it('parseAndSerialise - json sourced roundtrip check - asserts', () => {
    const input = {
      assertions: [
        {
          annotations: [{ name: 'description', value: 'hello' }],
          name: 'res.status', value: 'eq 200', enabled: true }
      ]
    };

    const parsed = jsonToBru(input);
    const output = parser(parsed);

    expect(input).toEqual(output);
  });
});
