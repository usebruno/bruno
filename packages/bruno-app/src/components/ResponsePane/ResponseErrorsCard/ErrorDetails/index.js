import React, { useState } from 'react';
import { IconChevronDown, IconChevronRight, IconExternalLink } from '@tabler/icons';
import CodeSnippet from 'components/CodeSnippet';
import useOpenErrorSource from './useOpenErrorSource';
import { formatResponseErrorMessage } from 'utils/response-pane-errors';

const ErrorDetails = ({ error, item, collection }) => {
  const [isStackTraceOpen, setIsStackTraceOpen] = useState(false);
  const { canOpenSource, openSource } = useOpenErrorSource(error, item, collection);

  const { source, filePath, line, lines, stack } = error;
  const location = typeof line === 'number' ? `${filePath}:${line}` : filePath;

  return (
    <div className="error-details">
      {source && (
        <div className="error-source" data-testid="response-errors-source-label">
          <span className="error-source-label">{source.label}</span>
          {canOpenSource ? (
            <button type="button" className="error-file-path navigable" data-testid="response-errors-file-path" onClick={openSource} title={`Open ${filePath}`}>
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
        {formatResponseErrorMessage(error)}
      </div>
      {stack && (
        <div>
          <button
            type="button"
            className="error-stack-trace-toggle"
            data-testid="response-errors-stack-trace-toggle"
            onClick={() => setIsStackTraceOpen(!isStackTraceOpen)}
            aria-expanded={isStackTraceOpen}
          >
            {isStackTraceOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            <span>{isStackTraceOpen ? 'Hide' : 'Show'} stack trace</span>
          </button>
          {isStackTraceOpen && (
            <pre className="error-stack-trace" data-testid="response-errors-stack-trace">{stack}</pre>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorDetails;
