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

const TEST_AWAIT_TIMEOUT_MS = 5000;

const createBruTestResultMethods = (bru, assertionResults, chai) => {
  const __brunoTestResults = new TestResults();
  const baseTest = Test(__brunoTestResults, chai);

  // Scripts call `test()` without awaiting it, so its promise is otherwise
  // orphaned. Tracking it here lets the caller wait for every test callback
  // to finish before reading results, regardless of which sandbox ran the
  // script.
  const pendingTestPromises = [];
  const test = (description, callback) => {
    const promise = baseTest(description, callback);
    // test() never rejects today (its whole body is wrapped in try/catch), but the
    // tracked copy is still caught here, at push time, as a guard against that
    // invariant changing - Promise.all below must never reject, or an unrelated bug in
    // one test would abort waiting for the rest. Catching immediately, rather than when
    // waitForPendingTests() eventually runs, also avoids a window where an already-rejected
    // promise has no handler yet and gets logged as an unhandled rejection.
    pendingTestPromises.push(promise.catch(() => {}));
    return promise;
  };

  // The only way this hangs is a callback whose own promise never settles - hence the
  // timeout race rather than a plain `await Promise.all(...)`.
  const waitForPendingTests = async (timeoutMs = TEST_AWAIT_TIMEOUT_MS) => {
    if (!pendingTestPromises.length) return;
    let timeoutId;
    try {
      await Promise.race([
        Promise.all(pendingTestPromises),
        new Promise((resolve) => {
          timeoutId = setTimeout(resolve, timeoutMs);
        })
      ]);
    } finally {
      clearTimeout(timeoutId);
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
