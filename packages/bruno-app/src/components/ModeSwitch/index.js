import React from 'react';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button';

const ModeSwitch = ({ isMarkdownMode, onToggle, className, ...props }) => {
  return (
    <StyledWrapper className={className} {...props}>
      <Button
        variant="ghost"
        size="sm"
        className={`${!isMarkdownMode ? 'is-active' : ''}`}
        onClick={() => { if (isMarkdownMode) onToggle(); }}
      >
        <span className="mode-text">Rich Text</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`${isMarkdownMode ? 'is-active' : ''}`}
        onClick={() => { if (!isMarkdownMode) onToggle(); }}
      >
        <span className="mode-text">Markdown</span>
      </Button>
    </StyledWrapper>
  );
};

export default ModeSwitch;
