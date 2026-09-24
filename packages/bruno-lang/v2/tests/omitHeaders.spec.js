const parser = require('../src/bruToJson');
const stringify = require('../src/jsonToBru');

describe('settings.omitHeaders', () => {
  it('parses omitHeaders list from settings', () => {
    const input = `
meta {
  name: Omit defaults
}

get {
  url: https://example.com
}

settings {
  encodeUrl: true
  timeout: 0
  omitHeaders: [
    User-Agent
    Accept-Encoding
    request-start-time
  ]
}
`;

    const output = parser(input);

    expect(output.settings).toEqual({
      encodeUrl: true,
      timeout: 0,
      omitHeaders: ['User-Agent', 'Accept-Encoding', 'request-start-time']
    });
  });

  it('stringifies omitHeaders as a settings list', () => {
    const input = {
      meta: {
        name: 'Omit defaults'
      },
      http: {
        method: 'get',
        url: 'https://example.com'
      },
      settings: {
        encodeUrl: true,
        timeout: 0,
        omitHeaders: ['User-Agent', 'Accept-Encoding']
      }
    };

    const output = stringify(input);

    expect(output).toContain('omitHeaders: [');
    expect(output).toContain('User-Agent');
    expect(output).toContain('Accept-Encoding');
    expect(output).not.toMatch(/omitHeaders: User-Agent/);
  });

  it('roundtrips omitHeaders through bru parse/stringify', () => {
    const bru = `
meta {
  name: Roundtrip
}

get {
  url: https://example.com
}

settings {
  encodeUrl: true
  timeout: 0
  omitHeaders: [
    User-Agent
    Accept
  ]
}
`;

    const parsed = parser(bru);
    const stringified = stringify({
      meta: { name: 'Roundtrip' },
      http: { method: 'get', url: 'https://example.com' },
      settings: parsed.settings
    });
    const reparsed = parser(stringified);

    expect(reparsed.settings.omitHeaders).toEqual(['User-Agent', 'Accept']);
  });

  it('does not emit omitHeaders when the list is empty', () => {
    const output = stringify({
      meta: { name: 'No omit' },
      http: { method: 'get', url: 'https://example.com' },
      settings: {
        encodeUrl: true,
        timeout: 0,
        omitHeaders: []
      }
    });

    expect(output).not.toContain('omitHeaders');
  });
});
