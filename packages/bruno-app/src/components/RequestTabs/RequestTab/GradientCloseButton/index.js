import React from 'react';
import CloseTabIcon from '../CloseTabIcon';
import DraftTabIcon from '../DraftTabIcon';
import StyledWrapper from './StyledWrapper';

// `indicator` (e.g. a running request) takes the draft icon's spot and wins over it.
const GradientCloseButton = ({ onClick, hasChanges = false, indicator }) => {
  const canClose = typeof onClick === 'function';

  return (
    <StyledWrapper className={`close-gradient ${hasChanges ? 'has-changes' : ''} ${indicator ? 'has-indicator' : ''} ${canClose ? '' : 'no-close'}`}>
      <div
        className="close-icon-container"
        onClick={canClose ? onClick : undefined}
        data-testid={canClose ? 'request-tab-close-icon' : 'request-tab-draft-icon'}
      >
        <span className="draft-icon-wrapper" data-testid="tab-draft-icon">
          {indicator || <DraftTabIcon />}
        </span>
        {canClose && (
          <span className="close-icon-wrapper">
            <CloseTabIcon />
          </span>
        )}
      </div>
    </StyledWrapper>
  );
};

export default GradientCloseButton;
