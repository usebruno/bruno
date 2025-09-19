const TestResults = require('../test-results');
const Test = require('../test');

// Calculate summary statistics for test results
const getResultsSummary = (results) => {
  const summary = {
    total: results.length,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  results.forEach((r) => {
    const passed = r.status === 'pass';
    if (passed) summary.passed += 1;
    else if (r.status === 'fail') summary.failed += 1;
    else summary.skipped += 1;
  });

  return summary;
};

const createBruTestResultMethods = (bru, assertionResults, chai) => {
  const __brunoTestResults = new TestResults();
  const test = Test(__brunoTestResults, chai);
  setupBruTestMethods(bru, __brunoTestResults, assertionResults);

  return { __brunoTestResults, test };
};

const setupBruTestMethods = (bru, __brunoTestResults, assertionResults) => {
  const getTestResults = async () => {
    let results = await __brunoTestResults.getResults();
    const summary = getResultsSummary(results);
    return {
      summary,
      results: results.map(r => ({
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
      results: results.map(r => ({
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