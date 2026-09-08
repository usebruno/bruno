const TestResults = require('../test-results');
const Test = require('../test');

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

/**
 * Called once per script phase - pre-request, post-response, and the Tests tab each call
 * this separately, from their own place in runtime/script-runtime.js and
 * runtime/test-runtime.js. Every call creates its own private `pendingTestPromises` array
 * below, so each phase tracks and waits for only its own test() calls
 */
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
   * Waits for every test() call registered so far to settle - including a test() called
   * from inside another test()'s callback, after this wait has already started. Mirrors
   * QuickJS's own waitForPendingDeferreds(). If a test() callback has its own delay (a
   * setTimeout, a slow request), this simply waits until that delay is over
   */
  const waitForPendingTests = async () => {
    while (pendingTestPromises.length) {
      const batch = pendingTestPromises.splice(0);
      await Promise.all(batch);
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
