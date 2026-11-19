import {
  applyOmitHeaders,
  shouldOmitConnection,
  getBrunoDefaultHeaders,
  getBrunoDefaultHeaderNames,
  getBrunoRuntimeUserAgent,
  BRUNO_DEFAULT_HEADERS
} from './default-headers';

const createHeaders = () => {
  const values = new Map<string, unknown>();
  return {
    values,
    set: (name: string, value: unknown) => {
      values.set(name.toLowerCase(), value);
    }
  };
};

describe('bruno default headers catalog', () => {
  it('includes the expected default header names', () => {
    expect(getBrunoDefaultHeaderNames()).toEqual([
      'User-Agent',
      'Accept',
      'Accept-Encoding',
      'Connection',
      'Host'
    ]);
  });

  it('marks Host as not omittable', () => {
    const host = BRUNO_DEFAULT_HEADERS.find((header) => header.name === 'Host');
    expect(host?.omittable).toBe(false);
  });

  it('uses an angle-bracket Host placeholder before the host is known', () => {
    const host = BRUNO_DEFAULT_HEADERS.find((header) => header.name === 'Host');
    expect(host?.previewValue).toBe('<derived from request URL>');
  });

  it('builds the runtime User-Agent', () => {
    expect(getBrunoRuntimeUserAgent('2.14.0')).toBe('bruno-runtime/2.14.0');
  });
});

describe('getBrunoDefaultHeaders by protocol', () => {
  const names = (httpVersion?: '1.1' | '2' | 'auto') =>
    getBrunoDefaultHeaders(httpVersion ? { httpVersion } : {}).map((h) => h.name);

  it('returns the HTTP/1.1 set by default (with Connection and Host)', () => {
    expect(names()).toEqual(['User-Agent', 'Accept', 'Accept-Encoding', 'Connection', 'Host']);
    expect(getBrunoDefaultHeaders().every((h) => h.note === undefined)).toBe(true);
  });

  it('drops Connection and renames Host to :authority on HTTP/2', () => {
    const http2 = names('2');
    expect(http2).not.toContain('Connection');
    expect(http2).not.toContain('Host');
    expect(http2).toContain(':authority');
    expect(getBrunoDefaultHeaders({ httpVersion: '2' }).every((h) => h.note === undefined)).toBe(true);
  });

  it('keeps the HTTP/1.1 shape for auto but annotates the protocol-dependent headers', () => {
    const headers = getBrunoDefaultHeaders({ httpVersion: 'auto' });
    expect(headers.map((h) => h.name)).toEqual(['User-Agent', 'Accept', 'Accept-Encoding', 'Connection', 'Host']);

    const connection = headers.find((h) => h.name === 'Connection');
    const host = headers.find((h) => h.name === 'Host');
    expect(connection?.note).toMatch(/HTTP\/2/);
    expect(host?.note).toMatch(/:authority/);

    // headers that are identical across protocols carry no note
    expect(headers.find((h) => h.name === 'Accept')?.note).toBeUndefined();
  });
});

describe('applyOmitHeaders', () => {
  it('sets omitted defaults to null', () => {
    const headers = createHeaders();
    applyOmitHeaders(headers, {
      omitHeaders: ['User-Agent', 'Accept-Encoding']
    });

    expect(headers.values.get('user-agent')).toBeNull();
    expect(headers.values.get('accept-encoding')).toBeNull();
  });

  it('does not omit Host', () => {
    const headers = createHeaders();
    applyOmitHeaders(headers, {
      omitHeaders: ['Host', 'User-Agent']
    });

    expect(headers.values.has('host')).toBe(false);
    expect(headers.values.get('user-agent')).toBeNull();
  });

  it('does not omit an explicit user header via omitHeaders alone', () => {
    const headers = createHeaders();
    applyOmitHeaders(headers, {
      omitHeaders: ['User-Agent'],
      explicitHeaderNames: ['User-Agent']
    });

    expect(headers.values.has('user-agent')).toBe(false);
  });

  it('clears an explicit header when listed in headersToDelete', () => {
    const headers = createHeaders();
    applyOmitHeaders(headers, {
      omitHeaders: ['User-Agent'],
      headersToDelete: ['User-Agent'],
      explicitHeaderNames: ['User-Agent']
    });

    expect(headers.values.get('user-agent')).toBeNull();
  });

  it('defers Connection clearing to the caller', () => {
    const headers = createHeaders();
    const result = applyOmitHeaders(headers, {
      omitHeaders: ['Connection']
    });

    expect(result.omitConnection).toBe(true);
    expect(headers.values.has('connection')).toBe(false);
  });
});

describe('shouldOmitConnection', () => {
  it('is true when Connection is omitted', () => {
    expect(shouldOmitConnection({ omitHeaders: ['Connection'] })).toBe(true);
  });

  it('is false when Connection is not listed', () => {
    expect(shouldOmitConnection({ omitHeaders: ['User-Agent'] })).toBe(false);
    expect(shouldOmitConnection()).toBe(false);
  });

  it('is false when the user set Connection explicitly', () => {
    expect(shouldOmitConnection({
      omitHeaders: ['Connection'],
      explicitHeaderNames: ['Connection']
    })).toBe(false);
  });

  it('is true when a script deletes an explicitly set Connection', () => {
    expect(shouldOmitConnection({
      omitHeaders: ['Connection'],
      headersToDelete: ['Connection'],
      explicitHeaderNames: ['Connection']
    })).toBe(true);
  });

  it('agrees with applyOmitHeaders on the same input', () => {
    const options = { omitHeaders: ['connection', 'User-Agent'], explicitHeaderNames: ['Accept'] };
    const headers = createHeaders();

    expect(shouldOmitConnection(options)).toBe(applyOmitHeaders(headers, options).omitConnection);
  });
});
