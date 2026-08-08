import React from 'react';
import { getPhasesByRequestType } from '@usebruno/common';

const BASE_RESULT_KEYS = ['testResults', 'assertionResults'];

const TestResultsLabel = ({ item }) => {
  const resultKeys = [...BASE_RESULT_KEYS, ...getPhasesByRequestType(item?.type).map((phase) => phase.TEST_RESULTS_KEY)];
  const allResults = resultKeys.flatMap((key) => item?.[key] || []);

  if (!allResults.length) {
    return 'Tests';
  }

  const totalNumberOfTests = allResults.length;
  const totalNumberOfFailedTests = allResults.filter((result) => result.status === 'fail').length;

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
