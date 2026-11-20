import React from 'react';
import { IconChevronRight } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const VariablesSection = ({ icon: Icon, title, count, subtitle, action, expanded, onToggle, testId, children }) => {
  return (
    <StyledWrapper className={expanded ? 'expanded' : 'collapsed'}>
      <div className="section-header flex items-center w-full">
        <button
          type="button"
          className="section-toggle flex flex-1 min-w-0 h-full items-center gap-2 px-2"
          aria-expanded={expanded}
          onClick={onToggle}
          data-testid={testId}
        >
          <IconChevronRight size={14} strokeWidth={2} className="section-chevron" />
          <Icon size={16} strokeWidth={1.5} className="section-icon" />
          <span className="section-title">{title}</span>
          <span className="section-count" data-testid="variables-section-count">{count}</span>
          {subtitle && <span className="section-subtitle" data-testid="variables-section-subtitle">{subtitle}</span>}
        </button>
        {action}
      </div>
      {expanded && <div className="section-content">{children}</div>}
    </StyledWrapper>
  );
};

export default VariablesSection;
