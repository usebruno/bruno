import React from 'react';
import { IconCircleCheck, IconCircleX } from '@tabler/icons';

// Counts the tests of whichever phases the protocol has: HTTP/GraphQL in pre-request &
// post-response plus its own tests and assertions, a gRPC call in its four call phases.
const TestResultsLabel = ({
  results,
  assertionResults,
  preRequestTestResults,
  postResponseTestResults,
  beforeCallStartTestResults,
  beforeMessageSendTestResults,
  afterMessageReceiveTestResults,
  afterCallEndTestResults
}) => {
  results = results || [];
  assertionResults = assertionResults || [];
  preRequestTestResults = preRequestTestResults || [];
  postResponseTestResults = postResponseTestResults || [];
  beforeCallStartTestResults = beforeCallStartTestResults || [];
  beforeMessageSendTestResults = beforeMessageSendTestResults || [];
  afterMessageReceiveTestResults = afterMessageReceiveTestResults || [];
  afterCallEndTestResults = afterCallEndTestResults || [];

  if (!results.length && !assertionResults.length && !preRequestTestResults.length && !postResponseTestResults.length && !beforeCallStartTestResults.length && !beforeMessageSendTestResults.length && !afterMessageReceiveTestResults.length && !afterCallEndTestResults.length) {
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

  const numberOfBeforeCallStartTests = beforeCallStartTestResults.length;
  const numberOfFailedBeforeCallStartTests = beforeCallStartTestResults.filter((result) => result.status === 'fail').length;

  const numberOfBeforeMessageSendTests = beforeMessageSendTestResults.length;
  const numberOfFailedBeforeMessageSendTests = beforeMessageSendTestResults.filter((result) => result.status === 'fail').length;

  const numberOfAfterMessageReceiveTests = afterMessageReceiveTestResults.length;
  const numberOfFailedAfterMessageReceiveTests = afterMessageReceiveTestResults.filter((result) => result.status === 'fail').length;

  const numberOfAfterCallEndTests = afterCallEndTestResults.length;
  const numberOfFailedAfterCallEndTests = afterCallEndTestResults.filter((result) => result.status === 'fail').length;

  const totalNumberOfTests = numberOfTests + numberOfAssertions + numberOfPreRequestTests + numberOfPostResponseTests + numberOfBeforeCallStartTests + numberOfBeforeMessageSendTests + numberOfAfterMessageReceiveTests + numberOfAfterCallEndTests;
  const totalNumberOfFailedTests = numberOfFailedTests + numberOfFailedAssertions + numberOfFailedPreRequestTests + numberOfFailedPostResponseTests + numberOfFailedBeforeCallStartTests + numberOfFailedBeforeMessageSendTests + numberOfFailedAfterMessageReceiveTests + numberOfFailedAfterCallEndTests;

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
