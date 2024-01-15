import React from 'react';
import classnames from 'classnames';
import statusCodePhraseMap from './get-status-code-phrase';
import StyledWrapper from './StyledWrapper';

// Todo: text-error class is not getting pulled in for 500 errors
const StatusCode = ({ status }) => {
  const getTabClassname = (status) => {
    return classnames('ml-2', {
      'text-ok': status >= 100 && status < 300,
      'text-error': status >= 300 && status < 600
    });
  };

  return (
    <StyledWrapper className={getTabClassname(status)}>
      {status} {statusCodePhraseMap[status]}
    </StyledWrapper>
  );
};
export default StatusCode;
