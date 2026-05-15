import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import { createPortal } from 'react-dom';
import Button from 'ui/Button';
import { useTheme } from 'providers/Theme';
import { useTranslation } from 'react-i18next';

const ConfirmSwitchEnv = ({ onCancel }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const warningColor = theme.status.warning.text;

  const modalContent = (
    <Modal
      size="md"
      title={t('WORKSPACE_ENVIRONMENTS.UNSAVED_CHANGES')}
      disableEscapeKey={true}
      disableCloseOnOutsideClick={true}
      closeModalFadeTimeout={150}
      handleCancel={onCancel}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      hideFooter={true}
    >
      <div className="flex items-center font-normal">
        <IconAlertTriangle color={warningColor} size={32} strokeWidth={1.5} />
        <h1 className="ml-2 text-lg font-semibold">{t('WORKSPACE_ENVIRONMENTS.HOLD_ON')}</h1>
      </div>
      <div className="font-normal mt-4">{t('WORKSPACE_ENVIRONMENTS.UNSAVED_CHANGES_DESC')}</div>

      <div className="flex justify-end mt-6">
        <div>
          <Button color="warning" onClick={onCancel}>
            {t('WORKSPACE_ENVIRONMENTS.CLOSE')}
          </Button>
        </div>
      </div>
    </Modal>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmSwitchEnv;
