/**
 * The InfoTip components needs to be nuked
 * This component will be the future replacement
 * We should allow icon and placement props to be passed in
 */

import React, { useState } from 'react';
import HelpIcon from 'components/Icons/Help';
import StyledWrapper from './StyledWrapper';

const Help = ({ children, width = 200 }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex items-center relative">
      <span
        className="flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <HelpIcon size={14}/>
      </span>
      {showTooltip && (
        <StyledWrapper
          className="absolute z-50 rounded-md p-3"
          style={{ 
            top: '50%',
            left: 'calc(100% + 8px)',
            transform: 'translateY(-50%)',
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