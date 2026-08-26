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

const TEST_AWAIT_TIMEOUT_MS = 5000;

const createBruTestResultMethods = (bru, assertionResults, chai) => {
  const __brunoTestResults = new TestResults();

  const pendingTests = [];

  const test = (description, callback) => {
    const entry = { description, settled: false, abandoned: false };

    const recorder = {
      addResult: (result) => {
        entry.settled = true;
        if (entry.abandoned) return;
        __brunoTestResults.addResult(result);
      }
    };

    const promise = Test(recorder, chai)(description, callback);

    entry.promise = promise.catch(() => {});
    pendingTests.push(entry);

    return promise;
  };

  /**
   * A script's test() calls aren't awaited by the script itself, so a slow async test()
   * can still be running when the script finishes and its results get read - meaning that
   * test silently never shows up as passed, failed, or anything else. This function is
   * called before results are read, and waits for every test() callback registered so far
   * to actually finish (including ones a test() callback registers itself, after an await,
   * while this wait is already in progress) before letting the caller continue.
   *
   * That wait is capped at `timeoutMs` so one stuck test() can't hang the whole run
   * forever - anything still unfinished at that point is recorded as a failed, timed-out
   * result instead of just disappearing, and its eventual real result (it keeps running
   * in the background even after we stop waiting on it) is ignored so it doesn't show up
   * a second time later.
   */
  const waitForPendingTests = async (timeoutMs = TEST_AWAIT_TIMEOUT_MS) => {
    if (!pendingTests.length) return;

    let timedOut = false;
    let timeoutId;
    const deadline = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        resolve();
      }, timeoutMs);
    });

    try {
      let cursor = 0;
      while (!timedOut && cursor < pendingTests.length) {
        const batch = pendingTests.slice(cursor).map((entry) => entry.promise);
        cursor = pendingTests.length;
        await Promise.race([Promise.all(batch), deadline]);
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (!timedOut) return;

    pendingTests
      .filter((entry) => !entry.settled)
      .forEach((entry) => {
        entry.abandoned = true;
        __brunoTestResults.addResult({
          description: entry.description,
          status: 'fail',
          error: `Test callback did not complete within ${timeoutMs}ms and was abandoned.`,
          errorName: 'TestTimeoutError'
        });
      });
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
