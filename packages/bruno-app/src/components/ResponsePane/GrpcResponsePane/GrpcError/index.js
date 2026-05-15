import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const GrpcError = ({ error, onClose }) => {
  const { t } = useTranslation();

  if (!error) return null;

  return (
    <StyledWrapper>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="error-title">{t('GRPC_RESPONSE.SERVER_ERROR')}</div>
          <div className="error-message">{typeof error === 'string' ? error : JSON.stringify(error, null, 2)}</div>
        </div>
        <div className="close-button flex-shrink-0 cursor-pointer" onClick={onClose}>
          <IconX size={16} strokeWidth={1.5} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default GrpcError;
