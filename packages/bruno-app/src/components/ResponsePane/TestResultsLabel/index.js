import React from 'react';
import { IconCircleCheck, IconCircleX } from '@tabler/icons';

const TestResultsLabel = ({ results, assertionResults, preRequestTestResults, postResponseTestResults }) => {
  results = results || [];
  assertionResults = assertionResults || [];
  preRequestTestResults = preRequestTestResults || [];
  postResponseTestResults = postResponseTestResults || [];

  if (!results.length && !assertionResults.length && !preRequestTestResults.length && !postResponseTestResults.length) {
    return 'Tests';
  }

  const numberOfTests = results.length;
  const numberOfFailedTests = results.filter((result) => result.status === 'fail').length;

  const numberOfAssertions = assertionResults.length;
  const numberOfFailedAssertions = assertionResults.filter((result) => result.status === 'fail').length;

  const numberOfPreRequestTests = preRequestTestResults.length;
  const numberOfFailedPreRequestTests = preRequestTestResults.filter((result) => result.status === 'fail').length;

  const numberOfPostResponseTests = postResponseTestResults.length;
  const numberOfFailedPostResponseTests = postResponseTestResults.filter((result) => result.status === 'fail').length;

  const totalNumberOfTests = numberOfTests + numberOfAssertions + numberOfPreRequestTests + numberOfPostResponseTests;
  const totalNumberOfFailedTests = numberOfFailedTests + numberOfFailedAssertions + numberOfFailedPreRequestTests + numberOfFailedPostResponseTests;

  return (
    <div className="flex items-center">
      <div>Tests</div>
      {totalNumberOfFailedTests ? (
        <sup className="sups some-tests-failed ml-1 font-medium">{totalNumberOfFailedTests}</sup>
      ) : (
        <sup className="sups all-tests-passed ml-1 font-medium">{totalNumberOfTests}</sup>
      )}
    </div>
  );
};

export default TestResultsLabel;
