import React from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import importPostmanEnvironment from 'utils/importers/postman-environment';
import { toastError } from 'utils/common/error';
import { IconDatabaseImport } from '@tabler/icons';
import { addGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import StyledWrapper from './StyledWrapper';

const ImportEnvironment = ({ onClose, onEnvironmentCreated }) => {
  const dispatch = useDispatch();

  const handleImportPostmanEnvironment = () => {
    importPostmanEnvironment()
      .then((environments) => {
        const importPromises = environments
          .filter((env) =>
            env.name && env.name !== 'undefined')
          .map((environment) =>
            dispatch(addGlobalEnvironment({ name: environment.name, variables: environment.variables }))
              .then(() => {
                toast.success('Environment imported successfully');
              })
              .catch((error) => {
                toast.error('An error occurred while importing the environment');
                console.error(error);
              }));
        return Promise.all(importPromises);
      })
      .then(() => {
        onClose();
        // Call the callback if provided
        if (onEnvironmentCreated) {
          onEnvironmentCreated();
        }
      })
      .catch((err) => toastError(err, 'Postman Import environment failed'));
  };

  return (
    <StyledWrapper>
      <Portal>
        <Modal size="sm" title="Import Environment" hideFooter={true} handleConfirm={onClose} handleCancel={onClose} dataTestId="import-environment-modal">
          <button
            type="button"
            onClick={handleImportPostmanEnvironment}
            className="import-button flex justify-center flex-col items-center w-full rounded-lg border-2 border-dashed p-12 text-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            data-testid="import-postman-environment"
          >
            <IconDatabaseImport size={64} />
            <span className="mt-2 block text-sm font-semibold">Import your Postman environments</span>
          </button>
        </Modal>
      </Portal>
    </StyledWrapper>
  );
};

export default ImportEnvironment;
