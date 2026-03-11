import React from 'react';
import StyledWrapper from './StyledWrapper';

const renderLine = (line, highlightClass) => {
  const isHighlighted = line.isHighlighted || line.isError;
  return (
    <div
      key={line.lineNumber}
      className={`code-line ${isHighlighted ? highlightClass : ''}`}
    >
      <span className="code-line-number">{line.lineNumber}</span>
      <span className="code-line-content">
        {isHighlighted ? '> ' : '  '}{line.content}
      </span>
    </div>
  );
};

const CodeSnippet = ({ lines, hunks, variant = 'error' }) => {
  const highlightClass = variant === 'warning' ? 'highlighted-warning' : 'highlighted-error';

  if (hunks?.length) {
    return (
      <StyledWrapper>
        <div className="code-snippet">
          {hunks.map((hunk, idx) => (
            <React.Fragment key={idx}>
              {hunk.hasSeparatorBefore && (
                <div className="code-line code-line-separator">
                  <span className="code-line-number"></span>
                  <span className="code-line-content separator-content">{'\u22EE'}</span>
                </div>
              )}
              {hunk.lines.map((line) => renderLine(line, highlightClass))}
            </React.Fragment>
          ))}
        </div>
      </StyledWrapper>
    );
  }

  if (!lines?.length) return null;

  return (
    <StyledWrapper>
      <div className="code-snippet">
        {lines.map((line) => renderLine(line, highlightClass))}
      </div>
    </StyledWrapper>
  );
};

export default CodeSnippet;
