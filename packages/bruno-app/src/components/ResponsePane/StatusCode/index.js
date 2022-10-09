import React from 'react';
import classnames from 'classnames';
import statusCodePhraseMap from './get-status-code-phrase';
import StyledWrapper from './StyledWrapper';

const StatusCode = ({status}) => {
  const getTabClassname = () => {
    return classnames('', {
      'text-blue-700': status >= 100 && status < 200,
      'text-green-700': status >= 200 && status < 300,
      'text-purple-700': status >= 300 && status < 400,
      'text-yellow-700': status >= 400 && status < 500,
      'text-red-700': status >= 500 && status < 600
    });
  };

  return (
    <StyledWrapper className={getTabClassname()}>
      {status} {statusCodePhraseMap[status]}
    </StyledWrapper>
  )
};
export default StatusCode;