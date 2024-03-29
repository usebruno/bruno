const { describe, it, expect } = require('@jest/globals');

const { printRunSummary } = require('../../src/commands/run');

describe('printRunSummary', () => {
  // Suppress console.log output
  jest.spyOn(console, 'log').mockImplementation(() => {});

  it('should produce the correct summary for a successful run', () => {
    const results = [
      {
        testResults: [{ status: 'pass' }, { status: 'pass' }, { status: 'pass' }],
        assertionResults: [{ status: 'pass' }, { status: 'pass' }],
        error: null
      },
      {
        testResults: [{ status: 'pass' }, { status: 'pass' }],
        assertionResults: [{ status: 'pass' }, { status: 'pass' }, { status: 'pass' }],
        error: null
      }
    ];

    const summary = printRunSummary(results);

    expect(summary.totalRequests).toBe(2);
    expect(summary.passedRequests).toBe(2);
    expect(summary.failedRequests).toBe(0);
    expect(summary.totalAssertions).toBe(5);
    expect(summary.passedAssertions).toBe(5);
    expect(summary.failedAssertions).toBe(0);
    expect(summary.totalTests).toBe(5);
    expect(summary.passedTests).toBe(5);
    expect(summary.failedTests).toBe(0);
  });

  it('should produce the correct summary for a failed run', () => {
    const results = [
      {
        testResults: [{ status: 'fail' }, { status: 'pass' }, { status: 'pass' }],
        assertionResults: [{ status: 'pass' }, { status: 'fail' }],
        error: null
      },
      {
        testResults: [{ status: 'pass' }, { status: 'fail' }],
        assertionResults: [{ status: 'pass' }, { status: 'fail' }, { status: 'fail' }],
        error: null
      },
      {
        testResults: [],
        assertionResults: [],
        error: new Error('Request failed')
      }
    ];

    const summary = printRunSummary(results);

    expect(summary.totalRequests).toBe(3);
    expect(summary.passedRequests).toBe(2);
    expect(summary.failedRequests).toBe(1);
    expect(summary.totalAssertions).toBe(5);
    expect(summary.passedAssertions).toBe(2);
    expect(summary.failedAssertions).toBe(3);
    expect(summary.totalTests).toBe(5);
    expect(summary.passedTests).toBe(3);
    expect(summary.failedTests).toBe(2);
  });
});
