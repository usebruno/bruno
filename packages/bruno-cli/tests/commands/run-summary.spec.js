const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { printRunSummary } = require('../../src/commands/run');
const { stripAnsi } = require('../integration/helpers/strip-ansi');

const getTableCell = (output, metric) => {
  const row = output.split('\n').find((line) => line.includes(`│ ${metric}`));
  return row.split('│')[2].trim();
};

const baseResult = {
  status: 'pass',
  runDuration: 0.01,
  assertionResults: []
};

describe('printRunSummary', () => {
  let logSpy;

  const printedOutput = () => stripAnsi(logSpy.mock.calls.map((call) => call.join(' ')).join('\n'));

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('counts tests from the tests block, pre-request script and post-response script', () => {
    printRunSummary([
      {
        ...baseResult,
        testResults: [{ status: 'pass' }],
        preRequestTestResults: [{ status: 'pass' }],
        postResponseTestResults: [{ status: 'pass' }, { status: 'pass' }]
      }
    ]);

    const output = printedOutput();
    expect(getTableCell(output, 'Tests')).toBe('4/4');
    expect(getTableCell(output, 'Status')).toBe('✓ PASS');
  });

  it('counts script tests when the tests block is empty', () => {
    printRunSummary([
      {
        ...baseResult,
        testResults: [],
        preRequestTestResults: [],
        postResponseTestResults: [{ status: 'pass' }, { status: 'pass' }, { status: 'pass' }]
      }
    ]);

    const output = printedOutput();
    expect(getTableCell(output, 'Tests')).toBe('3/3');
    expect(getTableCell(output, 'Status')).toBe('✓ PASS');
  });

  it('reports a failing script test in the count and the status', () => {
    printRunSummary([
      {
        ...baseResult,
        testResults: [],
        preRequestTestResults: [{ status: 'pass' }],
        postResponseTestResults: [{ status: 'pass' }, { status: 'fail' }]
      }
    ]);

    const output = printedOutput();
    expect(getTableCell(output, 'Tests')).toBe('2/3');
    expect(getTableCell(output, 'Status')).toBe('✗ FAIL');
  });

  it('does not count script errors as tests but still fails the run', () => {
    printRunSummary([
      {
        ...baseResult,
        testResults: [],
        preRequestTestResults: [],
        postResponseTestResults: [{ status: 'pass' }, { status: 'fail', isScriptError: true }]
      }
    ]);

    const output = printedOutput();
    expect(getTableCell(output, 'Tests')).toBe('1/1');
    expect(getTableCell(output, 'Status')).toBe('✗ FAIL');
  });

  it('keeps passes and failures separate per source when results are mixed', () => {
    const summary = printRunSummary([
      {
        ...baseResult,
        testResults: [{ status: 'pass' }, { status: 'fail' }],
        preRequestTestResults: [{ status: 'fail' }],
        postResponseTestResults: [{ status: 'pass' }, { status: 'pass' }, { status: 'fail' }]
      }
    ]);

    const output = printedOutput();
    expect(getTableCell(output, 'Tests')).toBe('3/6');
    expect(getTableCell(output, 'Status')).toBe('✗ FAIL');
    expect(summary).toMatchObject({
      totalTests: 2,
      passedTests: 1,
      failedTests: 1,
      totalPreRequestTests: 1,
      passedPreRequestTests: 0,
      failedPreRequestTests: 1,
      totalPostResponseTests: 3,
      passedPostResponseTests: 2,
      failedPostResponseTests: 1
    });
  });
});
