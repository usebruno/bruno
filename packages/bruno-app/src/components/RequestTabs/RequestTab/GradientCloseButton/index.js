import React from 'react';
import CloseTabIcon from '../CloseTabIcon';
import DraftTabIcon from '../DraftTabIcon';
import StyledWrapper from './StyledWrapper';

const GradientCloseButton = ({ onClick, hasChanges = false }) => {
  return (
    <StyledWrapper className={`close-gradient ${hasChanges ? 'has-changes' : ''}`}>
      <div className="close-icon-container" onClick={onClick} data-testid="request-tab-close-icon">
        <span className="draft-icon-wrapper">
          <DraftTabIcon />
        </span>
        <span className="close-icon-wrapper">
          <CloseTabIcon />
        </span>
      </div>
    </StyledWrapper>
  );
};

export default GradientCloseButton;
