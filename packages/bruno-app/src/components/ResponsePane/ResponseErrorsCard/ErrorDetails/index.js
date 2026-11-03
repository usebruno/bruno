import React, { useState } from 'react';
import { IconChevronDown, IconChevronRight, IconExternalLink } from '@tabler/icons';
import CodeSnippet from 'components/CodeSnippet';
import useJumpToErrorSource from './useJumpToErrorSource';
import StyledWrapper from './StyledWrapper';
import { ERROR_DETAILS_HEADINGS } from 'utils/response-pane-errors';

const ErrorDetails = ({ error, item, collection }) => {
  const [isStackTraceOpen, setIsStackTraceOpen] = useState(false);
  const { canJumpToSource, jumpToSource } = useJumpToErrorSource(error, item, collection);

  const { kind, source, location, lines, details } = error;
  const detailsHeading = ERROR_DETAILS_HEADINGS[kind].toLowerCase();

  return (
    <StyledWrapper className="error-details">
      {source && (
        <div className="error-source" data-testid="response-errors-source-label">
          <span className="error-source-label">{source.label}</span>
          {canJumpToSource ? (
            <button type="button" className="error-file-path navigable" data-testid="response-errors-file-path" onClick={jumpToSource} title={`Open ${location}`}>
              <span>{location}</span>
              <IconExternalLink size={12} className="flex-shrink-0" />
            </button>
          ) : (
            <span className="error-file-path" data-testid="response-errors-file-path">
              <span>{location}</span>
            </span>
          )}
        </div>
      )}
      <CodeSnippet lines={lines} variant="error" />
      <div className="error-message" data-testid="response-errors-message">
        {error.displayMessage}
      </div>
      {details && (
        <div>
          <button
            type="button"
            className="error-stack-trace-toggle"
            data-testid="response-errors-stack-trace-toggle"
            onClick={() => setIsStackTraceOpen(!isStackTraceOpen)}
            aria-expanded={isStackTraceOpen}
          >
            {isStackTraceOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            <span>{isStackTraceOpen ? 'Hide' : 'Show'} {detailsHeading}</span>
          </button>
          {isStackTraceOpen && (
            <pre className="error-stack-trace" data-testid="response-errors-stack-trace">{details}</pre>
          )}
        </div>
      )}
    </StyledWrapper>
  );
};

export default ErrorDetails;
