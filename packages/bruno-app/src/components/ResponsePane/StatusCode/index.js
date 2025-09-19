import React from 'react';
import classnames from 'classnames';
import statusCodePhraseMap from './get-status-code-phrase';
import StyledWrapper from './StyledWrapper';

// Todo: text-error class is not getting pulled in for 500 errors
const StatusCode = ({ status }) => {
  const getTabClassname = (status) => {
    return classnames('ml-2', {
      'text-ok': status >= 100 && status < 200,
      'text-ok': status >= 200 && status < 300,
      'text-error': status >= 300 && status < 400,
      'text-error': status >= 400 && status < 500,
      'text-error': status >= 500 && status < 600
    });
  };

  return (
    <StyledWrapper className={`response-status-code ${getTabClassname(status)}`} data-testid="response-status-code">
      {status} {statusCodePhraseMap[status]}
    </StyledWrapper>
  );
};
export default StatusCode;
