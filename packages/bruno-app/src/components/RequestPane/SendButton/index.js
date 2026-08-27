import React from 'react';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const SendButton = ({ isLoading = false, disabled = false, onSend, onCancel, testId = 'send-request-btn' }) => {
  return (
    <StyledWrapper className="ml-2">
      <Button
        size="sm"
        disabled={disabled}
        variant={isLoading ? 'outline' : 'filled'}
        color="primary"
        data-testid={testId}
        data-action={isLoading ? 'cancel' : 'send'}
        onClick={isLoading ? onCancel : onSend}
      >
        {isLoading ? 'Cancel' : 'Send'}
      </Button>
    </StyledWrapper>
  );
};

export default SendButton;
