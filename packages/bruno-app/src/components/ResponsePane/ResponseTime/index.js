import React from 'react';
import StyledWrapper from './StyledWrapper';
import isNumber from 'lodash/isNumber';
import { formatDuration } from 'utils/common';

const ResponseTime = ({ duration }) => {
  if (!isNumber(duration)) {
    return null;
  }

  return <StyledWrapper className="ml-2" data-testid="response-time">{formatDuration(duration)}</StyledWrapper>;
};
export default ResponseTime;
