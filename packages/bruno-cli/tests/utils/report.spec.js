const { describe, it, expect, beforeEach } = require('@jest/globals');

const { cleanResults } = require('../../src/utils/report');

describe('cleanResults', () => {
  let results = [];
  beforeEach(() => {
    results = [
      {
        description: 'description provided',
        suitename: 'Tests/Suite A',
        request: {
          method: 'GET',
          url: 'https://ima.test'
        },
        assertionResults: [
          {
            lhsExpr: 'res.status',
            rhsExpr: 'eq 200',
            status: 'pass'
          },
          {
            lhsExpr: 'res.status',
            rhsExpr: 'neq 200',
            status: 'fail',
            error: 'expected 200 to not equal 200'
          }
        ],
        runtime: 1.2345678
      },
      {
        suitename: 'Tests/Suite B',
        request: {
          method: 'POST',
          url: 'https://imanother.test',
          headers: {
            authorization: 'Bearer some token'
          },
          data: 'Any data'
        },
        response: {
          status: 200,
          headers: {
            'Set-Cookie': 'any cookie'
          },
          data: 'Any data'
        },
        testResults: [
          {
            lhsExpr: 'res.status',
            rhsExpr: 'eq 200',
            description: 'A test that passes',
            status: 'pass'
          },
          {
            description: 'A test that fails',
            status: 'fail',
            error: 'expected 200 to not equal 200',
            status: 'fail'
          }
        ],
        runtime: 2.3456789
      }
    ];
  });

  it('should do noting', () => {
    const cleaned = cleanResults(JSON.parse(JSON.stringify(results)), {
      omitRequestBodies: false,
      omitResponseBodies: false,
      skipSensitiveData: false,
      omitHeaders: false,
      skipHeaders: [],
      hideRequestBody: [],
      hideResponseBody: []
    });

    expect(cleaned).toStrictEqual(results);
  });

  it('should clean all request bodies', () => {
    const cleaned = cleanResults(results, {
      omitRequestBodies: true,
      omitResponseBodies: false,
      skipSensitiveData: false,
      omitHeaders: false,
      skipHeaders: [],
      hideRequestBody: [],
      hideResponseBody: []
    });

    expect(cleaned[0].request.data).toBeUndefined();
    expect(cleaned[1].request.data).toBe('[REDACTED]');
  });

  it('should clean all response bodies', () => {
    const cleaned = cleanResults(results, {
      omitRequestBodies: false,
      omitResponseBodies: true,
      skipSensitiveData: false,
      omitHeaders: false,
      skipHeaders: [],
      hideRequestBody: [],
      hideResponseBody: []
    });

    expect(cleaned[0].response).toBeUndefined();
    expect(cleaned[1].response.data).toBe('[REDACTED]');
  });

  it('should clean all sensitive data', () => {
    const cleaned = cleanResults(results, {
      omitRequestBodies: false,
      omitResponseBodies: false,
      skipSensitiveData: true,
      omitHeaders: false,
      skipHeaders: [],
      hideRequestBody: [],
      hideResponseBody: []
    });

    expect(cleaned[0].request.headers).toBeNull();
    expect(cleaned[0].request.data).toBeUndefined();
    expect(cleaned[0].response).toBeUndefined();

    expect(cleaned[1].request.headers).toBeNull();
    expect(cleaned[1].request.data).toBe('[REDACTED]');
    expect(cleaned[1].response.headers).toBeNull();
    expect(cleaned[1].response.data).toBe('[REDACTED]');
  });

  it('should clean all headers', () => {
    const cleaned = cleanResults(results, {
      omitRequestBodies: false,
      omitResponseBodies: false,
      skipSensitiveData: false,
      omitHeaders: true,
      skipHeaders: [],
      hideRequestBody: [],
      hideResponseBody: []
    });

    expect(cleaned[0].request.headers).toBeNull();
    expect(cleaned[0].response).toBeUndefined();

    expect(cleaned[1].request.headers).toBeNull();
    expect(cleaned[1].response.headers).toBeNull();
  });

  it('should clean listed headers', () => {
    const cleaned = cleanResults(results, {
      omitRequestBodies: false,
      omitResponseBodies: false,
      skipSensitiveData: false,
      omitHeaders: false,
      skipHeaders: ['authorization', 'Set-Cookie'],
      hideRequestBody: [],
      hideResponseBody: []
    });

    expect(cleaned[0].request.headers).toBeUndefined();
    expect(cleaned[0].response).toBeUndefined();

    expect(cleaned[1].request.headers.authorization).toBe('[REDACTED]');
    expect(cleaned[1].response.headers['Set-Cookie']).toBe('[REDACTED]');
  });

  it('should clean all request bodies', () => {
    const cleaned = cleanResults(results, {
      omitRequestBodies: false,
      omitResponseBodies: false,
      skipSensitiveData: false,
      omitHeaders: false,
      skipHeaders: [],
      hideRequestBody: ['**/*'],
      hideResponseBody: []
    });

    expect(cleaned[0].request.data).toBeUndefined();
    expect(cleaned[0].response).toBeUndefined();

    expect(cleaned[1].request.data).toBe('[REDACTED]');
    expect(cleaned[1].response.data).toBe('Any data');
  });

  it.each(['**/*', '**/Suite B', 'Tests/Suite B', '**/Suite*'])('should clean matching request bodies', (pattern) => {
    const cleaned = cleanResults(results, {
      omitRequestBodies: false,
      omitResponseBodies: false,
      skipSensitiveData: false,
      omitHeaders: false,
      skipHeaders: [],
      hideRequestBody: [pattern],
      hideResponseBody: []
    });

    expect(cleaned[0].request.data).toBeUndefined();
    expect(cleaned[0].response).toBeUndefined();

    expect(cleaned[1].request.data).toBe('[REDACTED]');
    expect(cleaned[1].response.data).not.toBe('[REDACTED]');
  });

  it.each(['**/*', '**/Suite B', 'Tests/Suite B', '**/Suite*'])('should clean matching response bodies', (pattern) => {
    const cleaned = cleanResults(results, {
      omitRequestBodies: false,
      omitResponseBodies: false,
      skipSensitiveData: false,
      omitHeaders: false,
      skipHeaders: [],
      hideRequestBody: [],
      hideResponseBody: [pattern]
    });

    expect(cleaned[0].request.data).toBeUndefined();
    expect(cleaned[0].response).toBeUndefined();

    expect(cleaned[1].request.data).not.toBe('[REDACTED]');
    expect(cleaned[1].response.data).toBe('[REDACTED]');
  });
});
