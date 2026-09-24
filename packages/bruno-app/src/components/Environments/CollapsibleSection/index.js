import React from 'react';
import { IconChevronRight } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CollapsibleSection = ({
  title,
  expanded,
  onToggle,
  badge,
  actions,
  children,
  testId
}) => {
  return (
    <StyledWrapper className={expanded ? 'expanded' : 'collapsed'}>
      <div className="section-header" onClick={onToggle} data-testid={testId}>
        <div className="section-title-wrapper">
          <IconChevronRight
            size={14}
            strokeWidth={2}
            className={`section-icon ${expanded ? 'expanded' : ''}`}
          />
          <span className="section-title">{title}</span>
          {badge !== undefined && badge !== null && (
            <span className="section-badge">{badge}</span>
          )}
        </div>
        {actions && (
          <div className="section-actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
      <div className="section-content">
        {children}
      </div>
    </StyledWrapper>
  );
};

export default CollapsibleSection;
