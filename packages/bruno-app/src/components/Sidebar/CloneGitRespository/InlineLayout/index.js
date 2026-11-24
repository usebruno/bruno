import React from 'react';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

// Shows the clone flow inside a page (like the Git page of the Open collection modal) instead of in its own modal.
// It takes the same props as Modal, so CloneGitRepository can pick either one without changing its content.
const InlineLayout = ({
  confirmText,
  handleConfirm,
  handleCancel,
  confirmDisabled,
  hideFooter,
  hideCancel,
  footerLeft,
  children
}) => (
  <StyledWrapper className="flex flex-col flex-1 min-h-0 w-full" data-testid="clone-git-inline-layout">
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto py-4" data-testid="clone-git-inline-body">{children}</div>
    {!hideFooter && (
      <div className="shrink-0 flex justify-between items-center py-4" data-testid="clone-git-inline-footer">
        <div>{footerLeft}</div>
        <div className="flex justify-end gap-2">
          {!hideCancel && (
            <Button
              type="button"
              color="secondary"
              variant="ghost"
              onClick={handleCancel}
              data-testid="clone-git-inline-cancel"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            disabled={confirmDisabled}
            onClick={handleConfirm}
            data-testid="clone-git-inline-confirm"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    )}
  </StyledWrapper>
);

export default InlineLayout;
