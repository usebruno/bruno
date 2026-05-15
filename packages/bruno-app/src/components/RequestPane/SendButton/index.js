import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const SendButton = ({ isLoading = false, onSend, onCancel, testId = 'send-request-btn' }) => {
  const { t } = useTranslation();

  return (
    <StyledWrapper className="ml-2">
      <Button
        size="sm"
        variant={isLoading ? 'outline' : 'filled'}
        color="primary"
        data-testid={testId}
        data-action={isLoading ? 'cancel' : 'send'}
        onClick={isLoading ? onCancel : onSend}
      >
        {isLoading ? t('SEND_BUTTON.CANCEL') : t('SEND_BUTTON.SEND')}
      </Button>
    </StyledWrapper>
  );
};

export default SendButton;
