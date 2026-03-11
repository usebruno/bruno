import React, { useState } from 'react';
import { IconX, IconChevronDown, IconChevronRight } from '@tabler/icons';
import ErrorBanner from 'ui/ErrorBanner';
import CodeSnippet from 'components/CodeSnippet';
import StyledWrapper from './StyledWrapper';

const ScriptErrorCard = ({ title, message, errorContext, onClose }) => {
  const [showStack, setShowStack] = useState(false);

  if (!errorContext) {
    return <ErrorBanner errors={[{ title, message }]} onClose={onClose} />;
  }

  return (
    <StyledWrapper>
      <div className="script-error-card">
        <div className="script-error-header">
          <div className="error-title">{title}</div>
          {onClose && (
            <div className="close-button flex-shrink-0 cursor-pointer" onClick={onClose}>
              <IconX size={16} strokeWidth={1.5} />
            </div>
          )}
        </div>
        {errorContext.filePath && (
          <div className="script-error-file">{errorContext.filePath}</div>
        )}
        <CodeSnippet lines={errorContext.lines} variant="error" />
        <div className="script-error-message">
          {errorContext.errorType}: {message}
        </div>
        {errorContext.stack && (
          <div>
            <div
              className="script-error-stack-toggle"
              onClick={() => setShowStack(!showStack)}
            >
              {showStack ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
              <span>{showStack ? 'Hide' : 'Show'} stack trace</span>
            </div>
            {showStack && (
              <pre className="script-error-stack">{errorContext.stack}</pre>
            )}
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

const ScriptError = ({ item, onClose }) => {
  const preRequestError = item?.preRequestScriptErrorMessage;
  const postResponseError = item?.postResponseScriptErrorMessage;
  const testScriptError = item?.testScriptErrorMessage;

  if (!preRequestError && !postResponseError && !testScriptError) return null;

  const preRequestContext = item?.preRequestScriptErrorContext;
  const postResponseContext = item?.postResponseScriptErrorContext;
  const testContext = item?.testScriptErrorContext;

  const hasAnyContext = preRequestContext || postResponseContext || testContext;

  // If no error context available for any error, fall back to ErrorBanner
  if (!hasAnyContext) {
    const errors = [];
    if (preRequestError) errors.push({ title: 'Pre-Request Script Error', message: preRequestError });
    if (postResponseError) errors.push({ title: 'Post-Response Script Error', message: postResponseError });
    if (testScriptError) errors.push({ title: 'Test Script Error', message: testScriptError });
    return <ErrorBanner errors={errors} onClose={onClose} className="mt-4 mb-2" />;
  }

  return (
    <div className="mt-4 mb-2 flex flex-col gap-2">
      {preRequestError && (
        <ScriptErrorCard
          title="Pre-Request Script Error"
          message={preRequestError}
          errorContext={preRequestContext}
          onClose={onClose}
        />
      )}
      {postResponseError && (
        <ScriptErrorCard
          title="Post-Response Script Error"
          message={postResponseError}
          errorContext={postResponseContext}
          onClose={onClose}
        />
      )}
      {testScriptError && (
        <ScriptErrorCard
          title="Test Script Error"
          message={testScriptError}
          errorContext={testContext}
          onClose={onClose}
        />
      )}
    </div>
  );
};

export default ScriptError;
