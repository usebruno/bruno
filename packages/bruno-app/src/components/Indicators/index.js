import React from 'react';
import DotIcon from 'components/Icons/Dot';

const DotIndicator = ({ colorClass = '' }) => (
  <sup className={`ml-[.125rem] opacity-80 font-medium ${colorClass}`}>
    <DotIcon width="10" />
  </sup>
);

export const ContentIndicator = () => <DotIndicator />;
export const ErrorIndicator = () => <DotIndicator colorClass="text-red-500" />;

export default ContentIndicator;