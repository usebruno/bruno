import { T_RunnerRequestExecutionResult, T_RunSummary } from "./types";

// todo: this is generic, not specific to html, can be moved out of the report/html sub-package
export const getRunnerSummary = (results: T_RunnerRequestExecutionResult[]): T_RunSummary => {
  let totalRequests = 0;
  let passedRequests = 0;
  let failedRequests = 0;
  let errorRequests = 0;
  let skippedRequests = 0;
  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let totalPreRequestTests = 0;
  let passedPreRequestTests = 0;
  let failedPreRequestTests = 0;
  let totalPostResponseTests = 0;
  let passedPostResponseTests = 0;
  let failedPostResponseTests = 0;

  for (const result of results || []) {
    const { status, testResults, assertionResults, preRequestTestResults, postResponseTestResults } = result;
    totalRequests += 1;
    totalTests += Number(testResults?.length) || 0;
    totalAssertions += Number(assertionResults?.length) || 0;
    totalPreRequestTests += Number(preRequestTestResults?.length) || 0;
    totalPostResponseTests += Number(postResponseTestResults?.length) || 0;

    if (status === 'skipped') {
      skippedRequests += 1;
      continue;
    }

    let anyFailed = false;
    for (const testResult of testResults || []) {
      if (testResult.status === "pass") {
        passedTests += 1;
      } else {
        anyFailed = true;
        failedTests += 1;
      }
    }
    for (const assertionResult of assertionResults || []) {
      if (assertionResult.status === "pass") {
        passedAssertions += 1;
      } else {
        anyFailed = true;
        failedAssertions += 1;
      }
    }
    for (const preRequestTestResult of preRequestTestResults || []) {
      if (preRequestTestResult.status === "pass") {
        passedPreRequestTests += 1;
      } else {
        anyFailed = true;
        failedPreRequestTests += 1;
      }
    }
    for (const postResponseTestResult of postResponseTestResults || []) {
      if (postResponseTestResult.status === "pass") {
        passedPostResponseTests += 1;
      } else {
        anyFailed = true;
        failedPostResponseTests += 1;
      }
    }

    if (!anyFailed && status !== "error") {
      passedRequests += 1;
    } else if (anyFailed) {
      failedRequests += 1;
    } else {
      errorRequests += 1;
    }
  }

  return {
    totalRequests,
    passedRequests,
    failedRequests,
    errorRequests,
    skippedRequests,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    totalTests,
    passedTests,
    failedTests,
    totalPreRequestTests,
    passedPreRequestTests,
    failedPreRequestTests,
    totalPostResponseTests,
    passedPostResponseTests,
    failedPostResponseTests,
  };
};