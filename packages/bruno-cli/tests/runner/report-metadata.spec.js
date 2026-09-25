const { describe, it, expect } = require('@jest/globals');
const { generateHtmlReport } = require('@usebruno/common/runner');

describe('HTML Report Generation', () => {
  it('should include all metadata in the HTML report', async () => {
    // Sample test results
    const mockResults = [
      {
        iterationIndex: 0,
        environment: 'production',
        results: [],
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
    ];

    // Generate HTML using mock data
    const htmlString = generateHtmlReport({
      runnerResults: mockResults,
      version: 'usebruno v1.16.0',
      environment: 'production',
      runCompletionTime: '2024-01-15T14:30:45.123Z'
    });

    // Verify the HTML contains expected metadata structure
    expect(htmlString).toContain('Bruno run dashboard');
    expect(htmlString).toContain('Date & Time');
    expect(htmlString).toContain('Version');
    expect(htmlString).toContain('Environment');
    expect(htmlString).toContain('Total run duration');
    expect(htmlString).toContain('Total data received');
    expect(htmlString).toContain('Average response time');

    expect(htmlString).toContain('{{ runCompletionTime }}');
    expect(htmlString).toContain('{{ brunoVersion }}');
    expect(htmlString).toContain('{{ environment }}');
    expect(htmlString).toContain('{{ totalDuration }}');
    expect(htmlString).toContain('{{ totalDataReceived }}');
    expect(htmlString).toContain('{{ averageResponseTime }}');
  });

  it('should include skipped requests with parsing errors in the HTML report', async () => {
    const mockResults = [
      {
        iterationIndex: 0,
        results: [
          {
            test: {
              filename: 'invalid-request.bru'
            },
            request: {
              method: null,
              url: null,
              headers: null,
              data: null
            },
            response: {
              status: 'skipped',
              statusText: 'Unexpected token',
              data: null,
              responseTime: 0
            },
            error: 'Unexpected token',
            status: 'skipped',
            skipped: true,
            assertionResults: [],
            testResults: [],
            preRequestTestResults: [],
            postResponseTestResults: [],
            name: 'invalid-request.bru',
            path: 'invalid-request.bru',
            runDuration: 0
          }
        ],
        summary: {
          totalRequests: 1,
          passedRequests: 0,
          failedRequests: 0,
          errorRequests: 0,
          skippedRequests: 1,
          totalAssertions: 0,
          passedAssertions: 0,
          failedAssertions: 0,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0
        }
      }
    ];

    const htmlString = generateHtmlReport({
      runnerResults: mockResults,
      version: 'usebruno v1.16.0',
      environment: null,
      runCompletionTime: '2024-01-15T14:30:45.123Z'
    });

    expect(htmlString).toContain('Request Skipped');
    expect(htmlString).toContain('summarySkippedRequests');
    expect(htmlString).toContain('result.response.status === \'skipped\'');
  });
});
