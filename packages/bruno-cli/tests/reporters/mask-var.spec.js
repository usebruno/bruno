const { describe, it, expect } = require('@jest/globals');
const { generateHtmlReport } = require('@usebruno/common/runner');

const {
  maskResultsVariableValues,
  MASK
} = require('../../src/utils/mask-variable-values');

const createMockResult = () => ({
  test: { filename: 'auth/login.bru' },
  request: {
    method: 'POST',
    url: 'https://api.example.com/login',
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify({
      username: 'actual-user',
      password: 'actual-secret'
    })
  },
  response: {
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify({ token: 'actual-secret', id: 1 }),
    url: 'https://api.example.com/login',
    responseTime: 150
  },
  error: null,
  status: 'pass',
  assertionResults: [],
  testResults: [],
  preRequestTestResults: [],
  postResponseTestResults: [],
  name: 'login',
  path: 'auth/login.bru',
  runDuration: 0.15
});

describe('reporter-mask-var', () => {
  it('masks the resolved values in request body, response body and headers', () => {
    const results = [createMockResult()];
    maskResultsVariableValues(results, {
      AffUser: 'actual-user',
      AffPass: 'actual-secret'
    });

    expect(JSON.parse(results[0].request.data)).toEqual({
      username: MASK,
      password: MASK
    });
    expect(JSON.parse(results[0].response.data)).toEqual({
      token: MASK,
      id: 1
    });
    expect(results[0].request.data).not.toContain('actual-user');
    expect(results[0].response.data).not.toContain('actual-secret');
  });

  it('masks inside longer strings, not only exact values', () => {
    const results = [createMockResult()];
    results[0].request.url
      = 'https://api.example.com/login?api_key=actual-secret&x=1';

    maskResultsVariableValues(results, { AffPass: 'actual-secret' });

    expect(results[0].request.url).toBe(
      `https://api.example.com/login?api_key=${MASK}&x=1`
    );
  });

  it('masks header values', () => {
    const results = [createMockResult()];
    results[0].request.headers = { authorization: 'Bearer actual-secret' };

    maskResultsVariableValues(results, { AffPass: 'actual-secret' });

    expect(results[0].request.headers.authorization).toBe(`Bearer ${MASK}`);
  });

  it('masks each string element of array-valued headers', () => {
    const results = [createMockResult()];
    results[0].response.headers = {
      'set-cookie': ['session=actual-secret', 'tracker=actual-user']
    };

    maskResultsVariableValues(results, {
      AffUser: 'actual-user',
      AffPass: 'actual-secret'
    });

    expect(results[0].response.headers['set-cookie']).toEqual([
      `session=${MASK}`,
      `tracker=${MASK}`
    ]);
  });

  it('replaces binary request bodies instead of exposing their bytes', () => {
    const results = [createMockResult()];
    results[0].request.data = Buffer.from('token=actual-secret');

    maskResultsVariableValues(results, { AffPass: 'actual-secret' });

    expect(results[0].request.data).toBe(MASK);
  });

  it('masks values inside error and assertion/test results', () => {
    const results = [createMockResult()];
    results[0].error = 'connect ECONNREFUSED for https://api.example.com/login?api_key=actual-secret';
    results[0].assertionResults = [
      {
        uid: 'a1',
        lhsExpr: 'res.body.token',
        rhsExpr: 'actual-secret',
        status: 'fail',
        error: 'expected actual-secret to equal other'
      }
    ];
    results[0].testResults = [
      { description: 'token contains actual-secret', status: 'fail' }
    ];

    maskResultsVariableValues(results, { AffPass: 'actual-secret' });

    expect(results[0].error).not.toContain('actual-secret');
    expect(JSON.stringify(results[0].assertionResults)).not.toContain('actual-secret');
    expect(JSON.stringify(results[0].testResults)).not.toContain('actual-secret');
    expect(results[0].error).toContain(MASK);
  });

  it('masks bail placeholder URLs that copied a selected value', () => {
    const results = [createMockResult()];
    // Placeholder shape pushed by the --bail path: url copied from the
    // request item without any sanitization.
    results.push({
      test: { filename: 'auth/logout.bru' },
      request: {
        method: 'POST',
        url: 'https://api.example.com/logout?api_key=actual-secret',
        headers: null,
        data: null
      },
      response: {
        status: 'skipped',
        statusText: null,
        data: null,
        responseTime: 0
      },
      status: 'skipped',
      skipped: true,
      skipReason: 'bail'
    });

    maskResultsVariableValues(results, { AffPass: 'actual-secret' });

    expect(results[1].request.url).not.toContain('actual-secret');
    expect(results[1].request.url).toContain(MASK);
  });

  it('masks the longest value first when one value contains another', () => {
    const results = [createMockResult()];
    results[0].request.data = 'prefix actual-secret-with-suffix suffix';

    maskResultsVariableValues(results, {
      Short: 'actual-secret',
      Long: 'actual-secret-with-suffix'
    });

    expect(results[0].request.data).toBe(`prefix ${MASK} suffix`);
  });

  it('leaves results untouched when no variable resolves to a string value', () => {
    const results = [createMockResult()];
    const before = JSON.stringify(results);

    maskResultsVariableValues(results, { Missing: undefined, Empty: '' });

    expect(JSON.stringify(results)).toBe(before);
  });

  it('masks in the HTML report output', () => {
    const results = [createMockResult()];
    maskResultsVariableValues(results, {
      AffUser: 'actual-user',
      AffPass: 'actual-secret'
    });
    const html = generateHtmlReport({
      runnerResults: [
        {
          iterationIndex: 0,
          results,
          summary: {
            totalRequests: 1,
            passedRequests: 1,
            failedRequests: 0,
            errorRequests: 0,
            skippedRequests: 0,
            totalAssertions: 0,
            passedAssertions: 0,
            failedAssertions: 0,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0
          }
        }
      ],
      version: 'usebruno v1.16.0',
      environment: null,
      runCompletionTime: '2026-09-27T00:00:00.000Z'
    });

    // The report embeds its data base64-encoded, so assert on the decoded
    // payload (the same way the reporter's other tests do) rather than on the
    // raw HTML string.
    const match = html.match(/JSON\.parse\(decodeBase64\('([^']+)'\)\)/);
    expect(match).not.toBeNull();
    const decoded = JSON.parse(
      Buffer.from(match[1], 'base64').toString('utf-8')
    );
    const result = decoded.results[0].results[0];

    expect(JSON.stringify(result)).not.toContain('actual-secret');
    expect(JSON.stringify(result)).not.toContain('actual-user');
    expect(result.request.data).toContain(MASK);
    expect(result.response.data).toContain(MASK);
  });
});
