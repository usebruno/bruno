import React from 'react';
import classnames from 'classnames';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import { extractErrorPreview, formatResponseErrorMessage } from 'utils/response-pane-errors';
import CopyErrorButton from '../CopyErrorButton';
import ErrorDetails from '../ErrorDetails';

const ErrorRow = ({ error, item, collection, isExpanded, onToggleExpanded, tooltipId }) => {
  return (
    <div className={classnames('error-row', { expanded: isExpanded })} data-testid="response-errors-row">
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
            <span className="error-row-preview" data-testid="response-errors-row-preview" title={formatResponseErrorMessage(error)}>
              {extractErrorPreview(error)}
            </span>
          )}
        </button>
        <CopyErrorButton error={error} tooltipId={tooltipId} />
      </div>
      {isExpanded && <ErrorDetails error={error} item={item} collection={collection} />}
    </div>
  );
};

export default ErrorRow;
