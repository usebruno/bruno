import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';

const ConfirmRequestClose = ({ item, example, onCancel, onCloseWithoutSave, onSaveAndClose }) => {
  const { t } = useTranslation();
  const isExample = !!example;
  const itemName = isExample ? example.name : item.name;
  const itemType = isExample ? t('SIDEBAR.EXAMPLE') : t('SIDEBAR.REQUEST');

  return (
    <Modal
      size="md"
      title={t('SIDEBAR.UNSAVED_CHANGES')}
      confirmText={t('SIDEBAR.SAVE_AND_CLOSE')}
      cancelText={t('SIDEBAR.CLOSE_WITHOUT_SAVING')}
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
        <h1 className="ml-2 text-lg font-medium">{t('SIDEBAR.HOLD_ON')}</h1>
      </div>
      <div className="font-normal mt-4">
        {t('SIDEBAR.UNSAVED_CHANGES_IN_ITEM', { type: itemType, name: itemName })}
      </div>

      <div className="flex justify-between mt-6">
        <div>
          <Button color="danger" onClick={onCloseWithoutSave}>
            {t('COMMON.DONT_SAVE')}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" color="secondary" variant="ghost" onClick={onCancel}>
            {t('COMMON.CANCEL')}
          </Button>
          <Button onClick={onSaveAndClose}>{t('COMMON.SAVE')}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmRequestClose;
