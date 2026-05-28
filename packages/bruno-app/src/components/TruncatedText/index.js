import React, { useState, useRef, useEffect } from 'react';

const TruncatedText = ({
  text,
  maxLines = 2,
  className = '',
  textClassName = '',
  buttonClassName = '',
  viewMoreText = 'View More',
  viewLessText = 'View Less',
  showButton = true,
  onToggle = null,
  children,
  dataTestId = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldTruncate, setShouldTruncate] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      const element = textRef.current;
      const computedStyle = window.getComputedStyle(element);
      const lineHeight = computedStyle.lineHeight;

      let actualLineHeight;
      if (lineHeight === 'normal') {
        // If line-height is 'normal', calculate it from font-size (typically 1.2x font-size)
        const fontSize = parseInt(computedStyle.fontSize, 10);
        actualLineHeight = fontSize * 1.2;
      } else {
        actualLineHeight = parseInt(lineHeight, 10);
      }

      const maxHeight = actualLineHeight * maxLines;

      // Add a small tolerance (3px) to account for sub-pixel rendering and rounding errors
      const tolerance = 3;

      // Check if text needs truncation
      if (element.scrollHeight > maxHeight + tolerance) {
        setShouldTruncate(true);
      } else {
        setShouldTruncate(false);
      }
    }
  }, [text, maxLines]);

  const handleToggle = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    if (onToggle) {
      onToggle(newExpandedState);
    }
  };

  const defaultTextStyles = {
    display: '-webkit-box',
    WebkitLineClamp: isExpanded ? 'none' : maxLines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word'
  };

  const defaultButtonStyles = {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: '0',
    marginLeft: '4px',
    textDecoration: 'underline',
    fontSize: 'inherit',
    fontFamily: 'inherit'
  };

  if (!text || text.trim().length === 0) {
    return null;
  }

  return (
    <div className={className} data-testid={dataTestId}>
      <div
        ref={textRef}
        className={textClassName}
        style={!isExpanded && shouldTruncate ? defaultTextStyles : {}}
      >
        {children || text}
      </div>

      {shouldTruncate && showButton && (
        <button
          type="button"
          className={buttonClassName}
          style={defaultButtonStyles}
          onClick={handleToggle}
          aria-label={isExpanded ? viewLessText : viewMoreText}
        >
          {isExpanded ? viewLessText : viewMoreText}
        </button>
      )}
    </div>
  );
};

export default TruncatedText;
