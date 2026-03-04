/**
 * The InfoTip components needs to be nuked
 * This component will be the future replacement
 * We should allow icon and placement props to be passed in
 */

import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import QuestionCircle from 'components/Icons/QuestionCircle';
import InfoCircle from 'components/Icons/InfoCircle';
import StyledWrapper from './StyledWrapper';

const GAP = 8;

const getPortalPosition = (rect, placement, width) => {
  switch (placement) {
    case 'top':
      return {
        top: rect.top - GAP,
        left: rect.left + rect.width / 2 - width / 2,
        transform: 'translateY(-100%)'
      };
    case 'bottom':
      return {
        top: rect.bottom + GAP,
        left: rect.left + rect.width / 2 - width / 2
      };
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - GAP - width,
        transform: 'translateY(-50%)'
      };
    case 'right':
    default:
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + GAP,
        transform: 'translateY(-50%)'
      };
  }
};

const iconMap = {
  question: QuestionCircle,
  info: InfoCircle
};

const Help = ({ children, width = 200, placement = 'right', icon = 'question', iconComponent: IconComponent, size = 14 }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState(null);
  const iconRef = useRef(null);
  const ResolvedIcon = IconComponent || iconMap[icon] || QuestionCircle;

  const handleMouseEnter = useCallback(() => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPosition(getPortalPosition(rect, placement, width));
    }
    setShowTooltip(true);
  }, [placement, width]);

  return (
    <div className="flex items-center">
      <span
        ref={iconRef}
        className="flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <ResolvedIcon size={size} />
      </span>
      {showTooltip && position && createPortal(
        <StyledWrapper
          className="z-50 rounded-md p-3"
          style={{
            position: 'fixed',
            ...position,
            width: `${width}px`
          }}
        >
          {children}
        </StyledWrapper>,
        document.body
      )}
    </div>
  );
};

export default Help;
