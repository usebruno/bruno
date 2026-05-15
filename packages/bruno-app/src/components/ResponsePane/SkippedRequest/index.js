import React from 'react';
import { IconCircleOff } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const SkippedRequest = () => {
  const { t } = useTranslation();

  return (
    <StyledWrapper>
      <div className="send-icon flex justify-center" style={{ fontSize: 200 }}>
        <IconCircleOff size={150} strokeWidth={1} />
      </div>
      <div className="flex mt-4 justify-center" style={{ fontSize: 25 }}>
        {t('RESPONSE_PANE.REQUEST_SKIPPED')}
      </div>
    </StyledWrapper>
  );
};

export default SkippedRequest;
