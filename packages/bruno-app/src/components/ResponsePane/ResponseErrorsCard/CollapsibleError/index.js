import React from 'react';
import classnames from 'classnames';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import CopyErrorButton from '../CopyErrorButton';
import ErrorDetails from '../ErrorDetails';
import StyledWrapper from './StyledWrapper';

const CollapsibleError = ({ error, item, collection, isExpanded, onToggleExpanded, tooltipId }) => {
  return (
    <StyledWrapper className={classnames({ expanded: isExpanded })} data-testid="response-errors-row">
      <div className="error-row-line">
        <button
          type="button"
          className="error-row-toggle"
          data-testid="response-errors-row-toggle"
          onClick={onToggleExpanded}
          aria-expanded={isExpanded}
        >
          <span className="error-row-chevron">
            {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </span>
          <span className="error-row-label">{error.label}</span>
          {!isExpanded && (
            <span className="error-row-preview" data-testid="response-errors-row-preview" title={error.displayMessage}>
              {error.preview}
            </span>
          )}
        </button>
        <CopyErrorButton error={error} tooltipId={tooltipId} />
      </div>
      {isExpanded && <ErrorDetails error={error} item={item} collection={collection} />}
    </StyledWrapper>
  );
};

export default CollapsibleError;
