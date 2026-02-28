import React from 'react';
import classnames from 'classnames';
import statusCodePhraseMap from './get-status-code-phrase';
import StyledWrapper from './StyledWrapper';

const StatusCode = ({ status, statusText, isStreaming }) => {
  const getTabClassname = (status) => {
    return classnames({
      'text-ok': status >= 100 && status < 300,
      'text-warning': status >= 300 && status < 400,
      'text-error': status >= 400 && status < 600
    });
  };

  return (
    <StyledWrapper className={`response-status-code ${getTabClassname(status)}`} data-testid="response-status-code">
      {status} {statusText || statusCodePhraseMap[status]} {isStreaming ? ' - STREAMING' : null}
    </StyledWrapper>
  );
};
export default StatusCode;
