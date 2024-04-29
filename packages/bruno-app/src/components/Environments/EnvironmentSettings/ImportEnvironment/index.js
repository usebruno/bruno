import React from 'react';
import Portal from 'components/Portal';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import importPostmanEnvironment from 'utils/importers/postman-environment';
import { importEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { toastError } from 'utils/common/error';
import Modal from 'components/Modal';

const getErrorMessage = (err) => {
  if (err.message.endsWith('environment: contains invalid characters')) {
    return 'The environment name contains one or more illegal characters (<, >, :, ", /, \\, |, ?, *).';
  }

  return 'An error occurred while importing the environment';
};

const ImportEnvironment = ({ onClose, collection }) => {
  const dispatch = useDispatch();

  const handleImportPostmanEnvironment = () => {
    importPostmanEnvironment()
      .then((environment) => {
        dispatch(importEnvironment(environment.name, environment.variables, collection.uid))
          .then(() => {
            toast.success('Environment imported successfully');
            onClose();
          })
          .catch((err) => toast.error(getErrorMessage(err)));
      })
      .catch((err) => toastError(err, 'Postman Import environment failed'));
  };

  return (
    <Portal>
      <Modal size="sm" title="Import Environment" hideFooter={true} handleConfirm={onClose} handleCancel={onClose}>
        <div>
          <div className="text-link hover:underline cursor-pointer" onClick={handleImportPostmanEnvironment}>
            Postman Environment
          </div>
        </div>
      </Modal>
    </Portal>
  );
};

export default ImportEnvironment;
