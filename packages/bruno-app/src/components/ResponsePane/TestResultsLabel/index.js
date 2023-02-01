import React from 'react';

const TestResultsLabel = ({ results }) => {
  if(!results || !results.length) {
    return 'Tests';
  }

  const numberOfTests = results.length;
  const numberOfFailedTests = results.filter(result => result.status === 'fail').length;

  return (
    <div className='flex items-center'>
      <div>Tests</div>
      {numberOfFailedTests ? (
        <sup className='sups some-tests-failed ml-1 font-medium'>
          {numberOfFailedTests}
        </sup>
      ) : (
        <sup className='sups all-tests-passed ml-1 font-medium'>
          {numberOfTests}
        </sup>
      )}
      </div>
  );
};

export default TestResultsLabel;
