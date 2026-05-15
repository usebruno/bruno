import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import { useTranslation } from 'react-i18next';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import Button from 'ui/Button';

const ConfirmCloseEnvironment = ({ onCancel, onCloseWithoutSave, onSaveAndClose, isGlobal, isDotEnv }) => {
  const { t } = useTranslation();
  let settingsLabel = t('ENVIRONMENTS.COLLECTION_ENV_SETTINGS');
  if (isDotEnv) {
    settingsLabel = t('ENVIRONMENTS.DOTENV_FILE');
  } else if (isGlobal) {
    settingsLabel = t('ENVIRONMENTS.GLOBAL_ENV_SETTINGS');
  }

  return (
    <Portal>
      <Modal
        size="md"
        title={t('ENVIRONMENTS.UNSAVED_CHANGES')}
        disableEscapeKey={true}
        disableCloseOnOutsideClick={true}
        closeModalFadeTimeout={150}
        handleCancel={onCancel}
        hideFooter={true}
      >
        <div className="flex items-center font-normal">
          <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
          <h1 className="ml-2 text-lg font-medium">{t('ENVIRONMENTS.HOLD_ON')}</h1>
        </div>
        <div className="font-normal mt-4">
          {t('ENVIRONMENTS.UNSAVED_CHANGES_MESSAGE', { settingsLabel })}
        </div>

        <div className="flex justify-between mt-6">
          <div>
            <Button color="danger" onClick={onCloseWithoutSave}>
              {t('ENVIRONMENTS.DONT_SAVE')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" color="secondary" variant="ghost" onClick={onCancel}>
              {t('ENVIRONMENTS.CANCEL')}
            </Button>
            <Button onClick={onSaveAndClose}>
              {t('ENVIRONMENTS.SAVE')}
            </Button>
          </div>
        </div>
      </Modal>
    </Portal>
  );
};

export default ConfirmCloseEnvironment;
