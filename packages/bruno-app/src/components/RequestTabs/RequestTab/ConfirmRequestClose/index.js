import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { useTranslation } from 'react-i18next';

const ConfirmRequestClose = ({ item, example, onCancel, onCloseWithoutSave, onSaveAndClose }) => {
  const { t } = useTranslation();
  const isExample = !!example;
  const itemName = isExample ? example.name : item.name;
  const itemType = isExample ? t('REQUEST_TABS.EXAMPLE_TYPE') : t('REQUEST_TABS.REQUEST_TYPE');

  return (
    <Modal
      size="md"
      title={t('REQUEST_TABS.UNSAVED_CHANGES')}
      confirmText={t('REQUEST_TABS.SAVE_AND_CLOSE')}
      cancelText={t('REQUEST_TABS.CLOSE_WITHOUT_SAVING')}
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
        <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
        <h1 className="ml-2 text-lg font-medium">{t('REQUEST_TABS.HOLD_ON')}</h1>
      </div>
      <div className="font-normal mt-4">
        {t('REQUEST_TABS.UNSAVED_CHANGES_IN', { name: itemName, type: itemType })}
      </div>

      <div className="flex justify-between mt-6">
        <div>
          <Button color="danger" onClick={onCloseWithoutSave}>
            {t('REQUEST_TABS.DONT_SAVE')}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" color="secondary" variant="ghost" onClick={onCancel}>
            {t('REQUEST_TABS.CANCEL')}
          </Button>
          <Button onClick={onSaveAndClose}>{t('REQUEST_TABS.SAVE')}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmRequestClose;
