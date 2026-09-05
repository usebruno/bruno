import React from 'react';
import { IconBan, IconChevronDown, IconChevronRight } from '@tabler/icons';
import CountBadge from 'ui/CountBadge';

const InvalidEnvironmentGroup = ({ invalid, isExpanded, toggleExpanded }) => {
  return (
    <div
      className="group-container"
      data-testid="env-import-invalid-group"
    >
      <div className="group-header">
        <div className="group-title-wrapper" onClick={toggleExpanded} role="button" tabIndex={0}>
          {isExpanded ? (
            <IconChevronDown size={16} className="chevron-icon" strokeWidth={1.6} />
          ) : (
            <IconChevronRight size={16} className="chevron-icon" strokeWidth={1.6} />
          )}
          <IconBan size={16} className="blocked-icon" />
          <span className="group-title">Could not be read</span>
          <CountBadge className="group-count" data-testid="env-import-invalid-count">
            {invalid.length}
          </CountBadge>
        </div>
      </div>
      {isExpanded && (
        <div className="group-list">
          {invalid.map((item, idx) => (
            <div key={`${item.fileName}-${idx}`} className="env-import-invalid-item" data-testid="env-import-invalid-item">
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

export default React.memo(InvalidEnvironmentGroup);
