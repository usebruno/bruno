const TestResults = require('../test-results');
const Test = require('../test');

// Calculate summary statistics for test results
const getResultsSummary = (results) => {
  const summary = {
    total: results.length,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  results.forEach((r) => {
    const passed = r.status === 'pass';
    if (passed) summary.passed += 1;
    else if (r.status === 'fail') summary.failed += 1;
    else summary.skipped += 1;
  });

  return summary;
};

const TEST_POLL_INTERVAL_MS = 2000;

const createBruTestResultMethods = (bru, assertionResults, chai) => {
  const __brunoTestResults = new TestResults();
  const baseTest = Test(__brunoTestResults, chai);

  const pendingTestPromises = [];

  const test = (description, callback) => {
    const promise = baseTest(description, callback);
    pendingTestPromises.push(promise.catch(() => {}));
    return promise;
  };

  /**
   * Waits for every test() call registered so far to settle, including ones registered
   * mid-wait. No cap or cancellation - mirrors QuickJS's own waitForPendingDeferreds().
   */
  const waitForPendingTests = async () => {
    let cursor = 0;
    while (cursor < pendingTestPromises.length) {
      // Captured before awaiting, so a test() pushed during the wait stays past the
      // cursor and is picked up next pass, instead of being skipped.
      const batchEnd = pendingTestPromises.length;
      const batch = pendingTestPromises.slice(cursor, batchEnd);

      let pollId;
      const poll = new Promise((resolve) => {
        pollId = setTimeout(() => resolve(false), TEST_POLL_INTERVAL_MS);
      });

      let settled;
      try {
        settled = await Promise.race([Promise.all(batch).then(() => true), poll]);
      } finally {
        clearTimeout(pollId);
      }

      if (settled) cursor = batchEnd;
    }
  };

  setupBruTestMethods(bru, __brunoTestResults, assertionResults);

  return { __brunoTestResults, test, waitForPendingTests };
};

const setupBruTestMethods = (bru, __brunoTestResults, assertionResults) => {
  const getTestResults = async () => {
    let results = await __brunoTestResults.getResults();
    const summary = getResultsSummary(results);
    return {
      summary,
      results: results.map((r) => ({
        status: r.status,
        description: r.description,
        expected: r.expected,
        actual: r.actual,
        error: r.error
      }))
    };
  };

  const getAssertionResults = async () => {
    let results = assertionResults;
    const summary = getResultsSummary(results);
    return {
      summary,
      results: results.map((r) => ({
        status: r.status,
        lhsExpr: r.lhsExpr,
        rhsExpr: r.rhsExpr,
        operator: r.operator,
        rhsOperand: r.rhsOperand,
        error: r.error
      }))
    };
  };

  // Set methods on bru object if provided
  if (bru) {
    bru.getTestResults = getTestResults;
    bru.getAssertionResults = getAssertionResults;
  }

  // Also return the methods for direct use
  return {
    getTestResults,
    getAssertionResults
  };
};

module.exports = {
  getResultsSummary,
  createBruTestResultMethods,
  setupBruTestMethods
};
