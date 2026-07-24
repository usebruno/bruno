import React from 'react';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button';

const ModeSwitch = ({ checked, onChange, className, ...props }) => {
  return (
    <StyledWrapper className={className} {...props}>
      <Button
        variant="ghost"
        size="sm"
        className={`${!checked ? 'is-active' : ''}`}
        onClick={() => { if (checked) onChange(); }}
      >
        <span className="mode-text">Rich Text</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`${checked ? 'is-active' : ''}`}
        onClick={() => { if (!checked) onChange(); }}
      >
        <span className="mode-text">Markdown</span>
      </Button>
    </StyledWrapper>
  );
};

export default ModeSwitch;
