const { describe, it, expect } = require('@jest/globals');
const fs = require('fs');

const mockGenerateHtmlReport = jest.fn(() => '<html>Mock HTML</html>');

jest.mock('@usebruno/common/runner', () => ({
  generateHtmlReport: mockGenerateHtmlReport
}));

const makeHtmlOutput = require('../../src/reporters/html');

describe('makeHtmlOutput', () => {
  let writeFileSyncSpy;

  beforeEach(() => {
    mockGenerateHtmlReport.mockClear();
    writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should pass environment parameter to generateHtmlReport when provided', async () => {
    const mockResults = {
      results: [],
      summary: {
        totalRequests: 0,
        passedRequests: 0,
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
    };

    await makeHtmlOutput(mockResults, '/tmp/test.html', '2024-01-15T14:30:45.123Z', 'production');

    expect(mockGenerateHtmlReport).toHaveBeenCalledWith(expect.objectContaining({
      environment: 'production'
    }));
  });

  it('should pass null environment when not provided', async () => {
    const mockResults = {
      results: [],
      summary: {
        totalRequests: 0,
        passedRequests: 0,
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
    };

    await makeHtmlOutput(mockResults, '/tmp/test.html', '2024-01-15T14:30:45.123Z');

    expect(mockGenerateHtmlReport).toHaveBeenCalledWith(expect.objectContaining({
      environment: null
    }));
  });
});
