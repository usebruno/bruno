const { parseBruFileMeta } = require("../../src/utils/collection");

describe('parseBruFileMeta', () => {
  test('parses valid meta block correctly', () => {
    const data = `meta {
      name: 0.2_mb
      type: http
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: '0.2_mb',
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('returns null for missing meta block', () => {
    const data = `someOtherBlock {
      key: value
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles empty meta block gracefully', () => {
    const data = `meta {}`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: undefined,
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('ignores invalid lines in meta block', () => {
    const data = `meta {
      name: 0.2_mb
      invalidLine
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: '0.2_mb',
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles unexpected input gracefully', () => {
    const data = null;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles missing colon gracefully', () => {
    const data = `meta {
      name 0.2_mb
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: undefined,
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('parses numeric values correctly', () => {
    const data = `meta {
      numValue: 1234
      floatValue: 12.34
      strValue: some_text
      seq: 5
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: undefined,
      seq: 5,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles syntax error in meta block 1', () => {
    const data = `meta 
      name: 0.2_mb
      type: http
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles syntax error in meta block 2', () => {
    const data = `meta {
      name: 0.2_mb
      type: http
      seq: 1
    `;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles graphql type correctly', () => {
    const data = `meta {
      name: graphql_query
      type: graphql
      seq: 2
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'graphql-request',
      name: 'graphql_query',
      seq: 2,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles unknown type correctly', () => {
    const data = `meta {
      name: unknown_request
      type: unknown
      seq: 3
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: 'unknown_request',
      seq: 3,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles missing seq gracefully', () => {
    const data = `meta {
      name: no_seq_request
      type: http
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: 'no_seq_request',
      seq: 1, // Default fallback
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });
});