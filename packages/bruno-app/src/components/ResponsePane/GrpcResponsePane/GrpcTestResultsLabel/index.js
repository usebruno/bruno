import React from 'react';
import StyledWrapper from './StyledWrapper';

const GrpcTestResultsLabel = ({ sections }) => {
  const results = sections.flatMap((section) => section.results);

  if (!results.length) {
    return 'Tests';
  }

  const failedCount = results.filter((result) => result.status === 'fail').length;

  return (
    <StyledWrapper className="flex items-center">
      <div>Tests</div>
      {failedCount ? (
        <sup className="some-tests-failed ml-1 font-medium" data-testid="grpc-tests-failed-count">{failedCount}</sup>
      ) : (
        <sup className="all-tests-passed ml-1 font-medium" data-testid="grpc-tests-passed-count">{results.length}</sup>
      )}
    </StyledWrapper>
  );
};

export default GrpcTestResultsLabel;
