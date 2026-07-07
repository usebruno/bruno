import React from 'react';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { getSendButtonTextColor } from 'utils/color';

const SendButton = ({ isLoading = false, onSend, onCancel, testId = 'send-request-btn', envColor = null }) => {
  const customStyle = envColor
    ? {
        background: envColor,
        color: getSendButtonTextColor(envColor),
        borderColor: envColor
      }
    : {};

  return (
    <StyledWrapper className="ml-2">
      <Button
        size="sm"
        variant={isLoading ? 'outline' : 'filled'}
        color={envColor ? undefined : 'primary'}
        style={customStyle}
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
