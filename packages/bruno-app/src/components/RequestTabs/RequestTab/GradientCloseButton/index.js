import React from 'react';
import CloseTabIcon from '../CloseTabIcon';
import DraftTabIcon from '../DraftTabIcon';
import StyledWrapper from './StyledWrapper';

const GradientCloseButton = ({ onClick, hasChanges = false, closeable = true }) => {
  return (
    <StyledWrapper className={`close-gradient ${hasChanges ? 'has-changes' : ''} ${closeable ? '' : 'no-close'}`}>
      <div
        className="close-icon-container"
        onClick={closeable ? onClick : undefined}
        data-testid={closeable ? 'request-tab-close-icon' : 'request-tab-draft-icon'}
      >
        <span className="draft-icon-wrapper" data-testid="tab-draft-icon">
          <DraftTabIcon />
        </span>
        {closeable && (
          <span className="close-icon-wrapper">
            <CloseTabIcon />
          </span>
        )}
      </div>
    </StyledWrapper>
  );
};

export default GradientCloseButton;
