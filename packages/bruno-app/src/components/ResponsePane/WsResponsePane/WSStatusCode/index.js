import React from 'react';
import classnames from 'classnames';
import wsStatusCodePhraseMap from './get-ws-status-code-phrase';
import StyledWrapper from './StyledWrapper';

const WSStatusCode = ({ status, text }) => {
  // gRPC status codes: 0 is success, anything else is an error
  const getTabClassname = (status) => {
    const isPending = text === 'PENDING' || text === 'STREAMING';
    return classnames('ml-2', {
      'text-ok': parseInt(status) === 0,
      'text-pending': isPending,
      'text-error': parseInt(status) > 0 && !isPending
    });
  };

  const statusText = text || wsStatusCodePhraseMap[status]

  return (
    <StyledWrapper className={getTabClassname(status)}>
      {Number.isInteger(status) ? <div className="mr-1">{status}</div> : null}
      {statusText && <div>{statusText}</div>}
    </StyledWrapper>
  );
};

export default WSStatusCode; 