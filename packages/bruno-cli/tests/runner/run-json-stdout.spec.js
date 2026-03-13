const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

jest.mock('../../src/utils/filesystem', () => ({
  exists: jest.fn(),
  isFile: jest.fn(),
  isDirectory: jest.fn()
}));

jest.mock('../../src/runner/run-single-request', () => ({
  runSingleRequest: jest.fn()
}));

jest.mock('../../src/utils/bru', () => ({
  getEnvVars: jest.fn(() => ({})),
  getOptions: jest.fn(() => ({}))
}));

jest.mock('../../src/utils/environment', () => ({
  parseEnvironmentJson: jest.fn((value) => value)
}));

jest.mock('@usebruno/common', () => ({
  isRequestTagsIncluded: jest.fn(() => true)
}));

jest.mock('../../src/reporters/junit', () => jest.fn());
jest.mock('../../src/reporters/html', () => jest.fn());

jest.mock('@usebruno/filestore', () => ({
  parseDotEnv: jest.fn(() => ({})),
  parseEnvironment: jest.fn(() => ({}))
}));

jest.mock('../../src/utils/collection', () => ({
  findItemInCollection: jest.fn(),
  createCollectionJsonFromPathname: jest.fn(),
  getCallStack: jest.fn(),
  FORMAT_CONFIG: {
    bru: { ext: '.bru' },
    yml: { ext: '.yml' }
  }
}));

jest.mock('../../src/utils/request', () => ({
  hasExecutableTestInScript: jest.fn(() => false)
}));

jest.mock('../../src/utils/run', () => ({
  createSkippedFileResults: jest.fn(() => [])
}));

jest.mock('../../src/utils/sanitize-results', () => ({
  sanitizeResultsForReporter: jest.fn()
}));

jest.mock('@usebruno/requests', () => ({
  getSystemProxy: jest.fn(async () => null)
}));

jest.mock('@usebruno/common/runner', () => ({
  getRunnerSummary: jest.fn()
}));

const { handler } = require('../../src/commands/run');
const { runSingleRequest } = require('../../src/runner/run-single-request');
const { exists } = require('../../src/utils/filesystem');
const { getCallStack, createCollectionJsonFromPathname } = require('../../src/utils/collection');
const { getRunnerSummary } = require('@usebruno/common/runner');

const summary = {
  totalRequests: 1,
  passedRequests: 1,
  failedRequests: 0,
  skippedRequests: 0,
  errorRequests: 0,
  totalAssertions: 0,
  passedAssertions: 0,
  failedAssertions: 0,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  totalPreRequestTests: 0,
  passedPreRequestTests: 0,
  failedPreRequestTests: 0,
  totalPostResponseTests: 0,
  passedPostResponseTests: 0,
  failedPostResponseTests: 0
};

describe('run command json stdout reporter', () => {
  let stdoutWriteSpy;
  let stderrSpy;
  let writeFileSpy;
  let processExitSpy;

  beforeEach(() => {
    global.brunoSkippedFiles = [];

    exists.mockImplementation(async (value) => {
      const pathname = String(value || '');
      if (path.basename(pathname) === '.env') {
        return false;
      }
      return true;
    });
    createCollectionJsonFromPathname.mockReturnValue({
      root: {},
      brunoConfig: {},
      format: 'bru'
    });
    getCallStack.mockReturnValue([
      {
        name: 'request-1',
        pathname: '/tmp/request-1.bru',
        request: {
          assertions: []
        },
        tags: []
      }
    ]);
    runSingleRequest.mockImplementation(async () => ({
      test: { filename: 'request-1.bru' },
      response: { status: 200, statusText: 'OK', responseTime: 10 },
      assertionResults: [],
      testResults: [],
      preRequestTestResults: [],
      postResponseTestResults: []
    }));
    getRunnerSummary.mockReturnValue(summary);

    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes run results json to stdout when reporter-json-stdout is enabled', async () => {
    await handler({
      paths: ['./request-1.bru'],
      format: 'json',
      reporterJsonStdout: true
    });

    const payload = stdoutWriteSpy.mock.calls.find((call) => {
      return typeof call[0] === 'string' && call[0].trim().startsWith('{') && call[0].includes('"summary"');
    })?.[0];

    expect(payload).toBeDefined();
    const json = JSON.parse(payload);

    expect(json).toHaveProperty('summary');
    expect(json).toHaveProperty('results');
    expect(json.results).toHaveLength(1);
    expect(payload.endsWith('\n')).toBe(true);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Ran all requests - 10 ms'));
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('does not write run results json to stdout without reporter-json-stdout', async () => {
    await handler({
      paths: ['./request-1.bru'],
      format: 'json'
    });

    const jsonPayload = stdoutWriteSpy.mock.calls.find((call) => {
      return typeof call[0] === 'string' && call[0].trim().startsWith('{') && call[0].includes('"summary"');
    });

    expect(jsonPayload).toBeUndefined();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('writes to both stdout and file reporter when both are enabled', async () => {
    await handler({
      paths: ['./request-1.bru'],
      format: 'json',
      reporterJsonStdout: true,
      reporterJson: 'results.json'
    });

    const payload = stdoutWriteSpy.mock.calls.find((call) => {
      return typeof call[0] === 'string' && call[0].trim().startsWith('{') && call[0].includes('"summary"');
    });

    expect(payload).toBeDefined();
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledWith('results.json', expect.any(String));
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('routes request logs to stderr when reporter-json-stdout is enabled', async () => {
    runSingleRequest.mockImplementation(async () => {
      console.log('request log line');
      return {
        test: { filename: 'request-1.bru' },
        response: { status: 200, statusText: 'OK', responseTime: 10 },
        assertionResults: [],
        testResults: [],
        preRequestTestResults: [],
        postResponseTestResults: []
      };
    });

    await handler({
      paths: ['./request-1.bru'],
      format: 'json',
      reporterJsonStdout: true
    });

    expect(stderrSpy).toHaveBeenCalledWith('request log line');
  });
});
