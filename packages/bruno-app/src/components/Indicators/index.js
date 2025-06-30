import React from 'react';
import DotIcon from 'components/Icons/Dot';

const Indicator = ({ type = 'default' }) => (
  <sup
    className={`ml-[.125rem] opacity-80 font-medium ${
      type === 'error' ? 'text-red-500' : ''
    }`}
  >
    <DotIcon width="10" />
  </sup>
);


export default Indicator;