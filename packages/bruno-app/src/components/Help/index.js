/**
 * The InfoTip components needs to be nuked
 * This component will be the future replacement
 * We should allow icon and placement props to be passed in
 */

import React, { useState } from 'react';
import HelpIcon from 'components/Icons/Help';
import StyledWrapper from './StyledWrapper';

const getPlacementStyles = (placement) => {
  switch (placement) {
    case 'top':
      return {
        bottom: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)'
      };
    case 'bottom':
      return {
        top: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)'
      };
    case 'left':
      return {
        top: '50%',
        right: 'calc(100% + 8px)',
        transform: 'translateY(-50%)'
      };
    case 'right':
    default:
      return {
        top: '50%',
        left: 'calc(100% + 8px)',
        transform: 'translateY(-50%)'
      };
  }
};

const Help = ({ children, width = 200, placement = 'right', icon = 'question', size = 14 }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex items-center relative">
      <span
        className="flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <HelpIcon size={size} icon={icon} />
      </span>
      {showTooltip && (
        <StyledWrapper
          className="absolute z-50 rounded-md p-3"
          style={{
            ...getPlacementStyles(placement),
            width: `${width}px`
          }}
        >
          {children}
        </StyledWrapper>
      )}
    </div>
  );
};

export default Help;
