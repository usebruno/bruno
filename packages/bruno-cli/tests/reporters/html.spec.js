const { describe, it, expect } = require('@jest/globals');
const fs = require('fs');

const mockGenerateHtmlReport = jest.fn(() => '<html>Mock HTML</html>');

jest.mock('@usebruno/common/runner', () => ({
  generateHtmlReport: mockGenerateHtmlReport
}));

const makeHtmlOutput = require('../../src/reporters/html');
const { CLI_VERSION } = require('../../src/constants');

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

    await makeHtmlOutput(mockResults, '/tmp/test.html', { runStartTime: '2024-01-15T14:30:40.000Z', runCompletionTime: '2024-01-15T14:30:45.123Z', environment: 'production' });

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

    await makeHtmlOutput(mockResults, '/tmp/test.html', { runStartTime: '2024-01-15T14:30:40.000Z', runCompletionTime: '2024-01-15T14:30:45.123Z' });

    expect(mockGenerateHtmlReport).toHaveBeenCalledWith(expect.objectContaining({
      environment: null
    }));
  });

  it('should pass the CLI version to generateHtmlReport as v followed by the version number', async () => {
    await makeHtmlOutput({ results: [], summary: {} }, '/tmp/test.html');

    expect(mockGenerateHtmlReport).toHaveBeenCalledWith(expect.objectContaining({
      version: `v${CLI_VERSION}`
    }));
  });

  it('should pass the run\'s start and completion times to generateHtmlReport', async () => {
    await makeHtmlOutput({ results: [], summary: {} }, '/tmp/test.html', {
      runStartTime: '2024-01-15T14:30:40.000Z',
      runCompletionTime: '2024-01-15T14:30:45.123Z'
    });

    expect(mockGenerateHtmlReport).toHaveBeenCalledWith(expect.objectContaining({
      runStartTime: '2024-01-15T14:30:40.000Z',
      runCompletionTime: '2024-01-15T14:30:45.123Z'
    }));
  });
});
