import React from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons';
import ScopePill from '../ScopePill';
import StyledWrapper from './StyledWrapper';

const ScopeSection = ({ icon: Icon, title, pill, count, isDanger, expanded, onToggle, onTitleClick, testId, children }) => {
  const handleTitleClick = (event) => {
    event.stopPropagation();
    onTitleClick();
  };

  return (
    <StyledWrapper className={`${expanded ? 'expanded' : 'collapsed'}${isDanger ? ' is-danger' : ''}`} data-testid={testId}>
      <div
        role="button"
        tabIndex={0}
        className="section-header"
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        data-testid={`${testId}-header`}
      >
        <Icon size={14} strokeWidth={1.5} className="section-icon" />
        {onTitleClick ? (
          <button
            type="button"
            className="section-title is-link"
            onClick={handleTitleClick}
            title={`Open ${title}`}
            data-testid={`${testId}-title`}
          >
            {title}
          </button>
        ) : (
          <span className="section-title" data-testid={`${testId}-title`}>{title}</span>
        )}
        {pill && <ScopePill label={pill.label} color={pill.color} />}
        <span className="section-count" data-testid="variables-section-count">{count}</span>
        {expanded
          ? <IconChevronUp size={14} strokeWidth={1.5} className="section-chevron" />
          : <IconChevronDown size={14} strokeWidth={1.5} className="section-chevron" />}
      </div>
      {expanded && <div className="section-content">{children}</div>}
    </StyledWrapper>
  );
};

export default ScopeSection;
