import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import { createPortal } from 'react-dom';
import Button from 'ui/Button';
import { useTheme } from 'providers/Theme';

const ConfirmSwitchEnv = ({ onCancel }) => {
  const { theme } = useTheme();
  const warningColor = theme.button2.color.warning.bg;

  const modalContent = (
    <Modal
      size="md"
      title="Unsaved changes"
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
        <IconAlertTriangle style={{ color: warningColor }} size={32} strokeWidth={1.5} />
        <h1 className="ml-2 text-lg font-semibold">Hold on..</h1>
      </div>
      <div className="font-normal mt-4">You have unsaved changes in this environment.</div>

      <div className="flex justify-end mt-6">
        <div>
          <Button color="warning" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmSwitchEnv;
