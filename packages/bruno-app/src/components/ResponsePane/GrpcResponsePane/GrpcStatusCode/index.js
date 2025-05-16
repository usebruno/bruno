import React from 'react';
import classnames from 'classnames';
import grpcStatusCodePhraseMap from './get-grpc-status-code-phrase';
import StyledWrapper from './StyledWrapper';

const GrpcStatusCode = ({ status, text }) => {
  // gRPC status codes: 0 is success, anything else is an error
  const getTabClassname = (status) => {
    return classnames('ml-2', {
      'text-ok': parseInt(status) === 0,
      'text-error': parseInt(status) !== 0
    });
  };

  const statusText = text || grpcStatusCodePhraseMap[status]

  return (
    <StyledWrapper className={getTabClassname(status)}>
      {Number.isInteger(status) ? <div className="mr-1">{status}</div> : null}
      {statusText && <div>{statusText}</div>}
    </StyledWrapper>
  );
};

export default GrpcStatusCode; 