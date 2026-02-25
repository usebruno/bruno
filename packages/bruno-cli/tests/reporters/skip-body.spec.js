const { describe, it, expect } = require('@jest/globals');
const { generateHtmlReport } = require('@usebruno/common/runner');

const { sanitizeResultsForReporter } = require('../../src/utils/sanitize-results');

const REQUEST_DATA = { username: 'john', password: 'secret123' };
const RESPONSE_DATA = { id: 1, username: 'john', email: 'john@example.com' };

const createMockResult = () => ({
  test: { filename: 'echo/echo-post.bru' },
  request: {
    method: 'POST',
    url: 'https://echo.usebruno.com',
    headers: { 'content-type': 'application/json' },
    data: { ...REQUEST_DATA }
  },
  response: {
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data: { ...RESPONSE_DATA },
    url: 'https://echo.usebruno.com',
    responseTime: 150
  },
  error: null,
  status: 'pass',
  assertionResults: [
    { lhsExpr: 'res.status', rhsExpr: 'eq 200', status: 'pass' }
  ],
  testResults: [
    { description: 'should return user data', status: 'pass' }
  ],
  preRequestTestResults: [],
  postResponseTestResults: [],
  name: 'echo post',
  path: 'echo/echo-post.bru',
  runDuration: 0.150
});

describe('reporter-skip-body', () => {
  describe('JSON report', () => {
    it('should exclude both request and response bodies with --reporter-skip-body', () => {
      const results = [createMockResult()];
      // --reporter-skip-body sets both skipRequestBody and skipResponseBody to true
      sanitizeResultsForReporter(results, { skipRequestBody: true, skipResponseBody: true });
      const json = JSON.parse(JSON.stringify({ summary: {}, results }));

      expect(json.results[0].request).not.toHaveProperty('data');
      expect(json.results[0].response).not.toHaveProperty('data');
    });
  });

  describe('HTML report', () => {
    const extractEmbeddedData = (htmlString) => {
      const match = htmlString.match(/JSON\.parse\(decodeBase64\('([^']+)'\)\)/);
      expect(match).not.toBeNull();
      const binary = atob(match[1]);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    };

    const generateHtml = (results) => generateHtmlReport({
      runnerResults: [{
        iterationIndex: 0,
        results,
        summary: { totalRequests: 1, passedRequests: 1, failedRequests: 0, errorRequests: 0, skippedRequests: 0, totalAssertions: 1, passedAssertions: 1, failedAssertions: 0, totalTests: 1, passedTests: 1, failedTests: 0 }
      }],
      version: 'usebruno v1.16.0',
      environment: null,
      runCompletionTime: '2024-01-15T14:30:45.123Z'
    });

    it('should exclude both bodies from HTML report with --reporter-skip-body', () => {
      const results = [createMockResult()];
      sanitizeResultsForReporter(results, { skipRequestBody: true, skipResponseBody: true });
      const embedded = extractEmbeddedData(generateHtml(results));
      const result = embedded.results[0].results[0];

      expect(result.request).not.toHaveProperty('data');
      expect(result.response).not.toHaveProperty('data');
    });
  });
});
