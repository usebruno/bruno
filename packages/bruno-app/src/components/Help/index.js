import React from 'react';
import QuestionCircle from 'components/Icons/QuestionCircle';
import InfoCircle from 'components/Icons/InfoCircle';
import Tooltip from 'ui/Tooltip';

const iconMap = {
  question: QuestionCircle,
  info: InfoCircle
};

const Help = ({ children, width = 200, placement = 'right', icon = 'question', iconComponent: IconComponent, size = 14, className = '' }) => {
  const ResolvedIcon = IconComponent || iconMap[icon] || QuestionCircle;

  return (
    <Tooltip content={children} place={placement} variant="rich" maxWidth={`${width}px`} className={`inline-flex items-center ${className}`}>
      <ResolvedIcon size={size} />
    </Tooltip>
  );
};

export default Help;
