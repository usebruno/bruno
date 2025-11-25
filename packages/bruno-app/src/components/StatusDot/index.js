import React from 'react';
import DotIcon from 'components/Icons/Dot';

const StatusDot = ({ type = 'default' }) => (
  <sup
    className={`opacity-80 font-medium ${
      type === 'error' ? 'text-red-500' : 'text-green-500'
    }`}
  >
    <DotIcon width="12" />
  </sup>
);


export default StatusDot;