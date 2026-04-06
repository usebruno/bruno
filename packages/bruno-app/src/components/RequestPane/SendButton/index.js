import React from 'react';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const SendButton = ({ isLoading = false, onSend, onCancel, sendTestId, cancelTestId }) => {
  return (
    <StyledWrapper className="ml-2">
      <Button
        size="sm"
        variant={isLoading ? 'outline' : 'filled'}
        color="primary"
        data-testid={isLoading ? cancelTestId : sendTestId}
        onClick={isLoading ? onCancel : onSend}
      >
        {isLoading ? 'Cancel' : 'Send'}
      </Button>
    </StyledWrapper>
  );
};

export default SendButton;
