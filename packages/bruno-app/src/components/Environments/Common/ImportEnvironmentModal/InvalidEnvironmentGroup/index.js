import React from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import CountBadge from 'ui/CountBadge';

const InvalidEnvironmentGroup = ({ invalid, hasBorderBottom, isExpanded, toggleExpanded }) => {
  if (!invalid || invalid.length === 0) return null;

  return (
    <div
      className={`group-container ${hasBorderBottom ? 'has-border-bottom' : ''}`}
      data-testid="env-import-invalid-group"
    >
      <div className="group-header">
        <div
          role="button"
          tabIndex={0}
          className="group-title-wrapper"
          onClick={toggleExpanded}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleExpanded();
            }
          }}
        >
          {isExpanded ? (
            <IconChevronDown size={16} className="chevron-icon" />
          ) : (
            <IconChevronRight size={16} className="chevron-icon" />
          )}
          <span className="group-title">Invalid or unsupported</span>
          <CountBadge variant="danger" className="ml-2" data-testid="env-import-invalid-count">
            {invalid.length}
          </CountBadge>
        </div>
      </div>
      {isExpanded && (
        <div className="group-list">
          {invalid.map((item, idx) => (
            <div key={idx} className="env-import-invalid-item" data-testid="env-import-invalid-item">
              <div className="env-item-content">
                <div className="env-name">{item.fileName}</div>
                <div className="env-error">{item.error}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvalidEnvironmentGroup;
