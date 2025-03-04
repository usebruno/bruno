import React from 'react';

const TestResultsLabel = ({ results, assertionResults, preRequestTestResults, postResponseTestResults }) => {
  results = results || [];
  assertionResults = assertionResults || [];
  preRequestTestResults = preRequestTestResults || [];
  postResponseTestResults = postResponseTestResults || [];

  const allTestResults = [...preRequestTestResults, ...results, ...postResponseTestResults];

  if (!allTestResults.length && !assertionResults.length) {
    return 'Tests';
  }

  const numberOfTests = allTestResults.length;
  const numberOfFailedTests = allTestResults.filter((result) => result.status === 'fail').length;

  const numberOfAssertions = assertionResults.length;
  const numberOfFailedAssertions = assertionResults.filter((result) => result.status === 'fail').length;

  const totalNumberOfTests = numberOfTests + numberOfAssertions;
  const totalNumberOfFailedTests = numberOfFailedTests + numberOfFailedAssertions;

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
