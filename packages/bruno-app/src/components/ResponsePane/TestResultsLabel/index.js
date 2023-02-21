import React from 'react';

const TestResultsLabel = ({ results, assertionResults }) => {
  results = results || [];
  assertionResults = assertionResults || [];
  if(!results.length && !assertionResults.length) {
    return 'Tests';
  }

  const numberOfTests = results.length;
  const numberOfFailedTests = results.filter(result => result.status === 'fail').length;

  const numberOfAssertions = assertionResults.length;
  const numberOfFailedAssertions = assertionResults.filter(result => result.status === 'fail').length;

  const totalNumberOfTests = numberOfTests + numberOfAssertions;
  const totalNumberOfFailedTests = numberOfFailedTests + numberOfFailedAssertions;

  return (
    <div className='flex items-center'>
      <div>Tests</div>
      {totalNumberOfFailedTests ? (
        <sup className='sups some-tests-failed ml-1 font-medium'>
          {totalNumberOfFailedTests}
        </sup>
      ) : (
        <sup className='sups all-tests-passed ml-1 font-medium'>
          {totalNumberOfTests}
        </sup>
      )}
      </div>
  );
};

export default TestResultsLabel;
