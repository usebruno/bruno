import React from 'react';
import DotIcon from 'components/Icons/Dot';

const StatusDot = ({ type = 'default', dataTestId = null }) => (
  <sup
    className={`ml-[.125rem] opacity-80 font-medium ${
      type === 'error' ? 'text-red-500' : ''
    }`}
    data-testid={dataTestId ? `status-dot-${dataTestId}` : 'status-dot'}
  >
    <DotIcon width="10" />
  </sup>
);

export default StatusDot;
