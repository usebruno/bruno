import React from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons';
import ScopePill from '../ScopePill';
import StyledWrapper from './StyledWrapper';

const ScopeSection = ({ icon: Icon, sectionKey, title, pill, count, isDanger, expanded, onToggle, onTitleClick, testId, children }) => {
  const handleTitleClick = (event) => {
    event.stopPropagation();
    onTitleClick();
  };

  const handleToggleClick = (event) => {
    event.stopPropagation();
    onToggle();
  };

  return (
    <StyledWrapper
      className={`${expanded ? 'expanded' : 'collapsed'}${isDanger ? ' is-danger' : ''}`}
      data-section-key={sectionKey}
      data-testid={testId}
    >
      <div className="section-header" onClick={onToggle} data-testid={`${testId}-header`}>
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
        <span className="section-count" data-testid="variables-section-count">{count}</span>
        {pill && <ScopePill label={pill.label} color={pill.color} />}
        <button
          type="button"
          className="section-chevron"
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
          onClick={handleToggleClick}
          data-testid={`${testId}-toggle`}
        >
          {expanded
            ? <IconChevronUp size={14} strokeWidth={1.5} />
            : <IconChevronDown size={14} strokeWidth={1.5} />}
        </button>
      </div>
      {expanded && <div className="section-content">{children}</div>}
    </StyledWrapper>
  );
};

export default ScopeSection;
