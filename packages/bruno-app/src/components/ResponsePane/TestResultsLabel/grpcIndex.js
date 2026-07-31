import React from 'react';

/**
 * The gRPC counterpart of ./index.js: a gRPC call has no Tests or Assert tab of its own — tests are
 * written with `test()` inside the four phase scripts — so the count comes from those four buckets.
 */
const GrpcTestResultsLabel = ({
  beforeCallStartTestResults,
  beforeMessageSendTestResults,
  afterMessageReceiveTestResults,
  afterCallEndTestResults
}) => {
  beforeCallStartTestResults = beforeCallStartTestResults || [];
  beforeMessageSendTestResults = beforeMessageSendTestResults || [];
  afterMessageReceiveTestResults = afterMessageReceiveTestResults || [];
  afterCallEndTestResults = afterCallEndTestResults || [];

  if (!beforeCallStartTestResults.length && !beforeMessageSendTestResults.length && !afterMessageReceiveTestResults.length && !afterCallEndTestResults.length) {
    return 'Tests';
  }

  const numberOfBeforeCallStartTests = beforeCallStartTestResults.length;
  const numberOfFailedBeforeCallStartTests = beforeCallStartTestResults.filter((result) => result.status === 'fail').length;

  const numberOfBeforeMessageSendTests = beforeMessageSendTestResults.length;
  const numberOfFailedBeforeMessageSendTests = beforeMessageSendTestResults.filter((result) => result.status === 'fail').length;

  const numberOfAfterMessageReceiveTests = afterMessageReceiveTestResults.length;
  const numberOfFailedAfterMessageReceiveTests = afterMessageReceiveTestResults.filter((result) => result.status === 'fail').length;

  const numberOfAfterCallEndTests = afterCallEndTestResults.length;
  const numberOfFailedAfterCallEndTests = afterCallEndTestResults.filter((result) => result.status === 'fail').length;

  const totalNumberOfTests = numberOfBeforeCallStartTests + numberOfBeforeMessageSendTests + numberOfAfterMessageReceiveTests + numberOfAfterCallEndTests;
  const totalNumberOfFailedTests = numberOfFailedBeforeCallStartTests + numberOfFailedBeforeMessageSendTests + numberOfFailedAfterMessageReceiveTests + numberOfFailedAfterCallEndTests;

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

export default GrpcTestResultsLabel;
