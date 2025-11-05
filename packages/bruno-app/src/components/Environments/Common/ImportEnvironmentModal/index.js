import React, { useState } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import importPostmanEnvironment from 'utils/importers/postman-environment';
import importBrunoEnvironment from 'utils/importers/bruno-environment';
import { readMultipleFiles } from 'utils/importers/file-reader';
import { importEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { toastError } from 'utils/common/error';
import { IconFileImport } from '@tabler/icons';

const ImportEnvironmentModal = ({ type = 'collection', collection, onClose, onEnvironmentCreated }) => {
  const dispatch = useDispatch();
  const [isDragOver, setIsDragOver] = useState(false);

  const isGlobal = type === 'global';

  // Validate required props
  if (!isGlobal && !collection) {
    console.error('ImportEnvironmentModal: collection prop is required when type is "collection"');
    return null;
  }
  const modalTitle = isGlobal ? 'Import Global Environment' : 'Import Environment';
  const modalTestId = isGlobal ? 'import-global-environment-modal' : 'import-environment-modal';
  const importTestId = isGlobal ? 'import-global-environment' : 'import-environment';

  const processEnvironments = async (environments, successMessage) => {
    const validEnvironments = environments.filter((env) => {
      if (env.name && env.name !== 'undefined') {
        return true;
      } else {
        toast.error('Failed to import environment: env has no name');
        return false;
      }
    });

    if (validEnvironments.length === 0) {
      toast.error('No valid environments found to import');
      return;
    }

    try {
      // Process environments sequentially to ensure unique name checking considers previously imported environments
      let importedCount = 0;
      for (const environment of validEnvironments) {
        const action = isGlobal
          ? addGlobalEnvironment({ name: environment.name, variables: environment.variables })
          : importEnvironment({ name: environment.name, variables: environment.variables, collectionUid: collection?.uid });

        await dispatch(action);
        importedCount++;
      }

      toast.success(`${importedCount > 1 ? `${importedCount} environments` : 'Environment'} imported successfully`);
    } catch (error) {
      toast.error('An error occurred while importing the environment(s)');
      console.error(error);
      throw error;
    }
  };

  const detectEnvironmentFormat = (data) => {
    // bruno environment `single-object` export type
    if (data.info && data.info.type === 'bruno-environment') {
      return 'bruno';
    } else if (Array.isArray(data)) {
      // bruno environment`single-file` export type
      return data.some((env) => env.info && env.info.type === 'bruno-environment') ? 'bruno' : 'postman';
    } else if (data.id && data.values) {
      // postman environment
      return 'postman';
    }
    return 'bruno';
  };

  const handleImportEnvironment = async (files) => {
    try {
      // Read and parse all files
      const parsedFiles = await readMultipleFiles(Array.from(files));

      // Detect format from first file's content
      const format = detectEnvironmentFormat(parsedFiles[0].content);
      let environments;

      if (format === 'postman') {
        environments = await importPostmanEnvironment(parsedFiles);
      } else {
        environments = await importBrunoEnvironment(parsedFiles);
      }

      await processEnvironments(environments);
      onClose();
      if (onEnvironmentCreated) {
        onEnvironmentCreated();
      }
    } catch (err) {
      toastError(err, 'Import environment failed');
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.json';
    input.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImportEnvironment(e.target.files);
      }
    };
    input.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImportEnvironment(files);
    }
  };

  return (
    <Portal>
      <Modal size="md" title={modalTitle} hideFooter={true} handleConfirm={onClose} handleCancel={onClose} dataTestId={modalTestId}>
        <div className="py-2">
          <div
            className={`flex justify-center flex-col items-center w-full dark:bg-zinc-700 rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
              isDragOver
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                : 'border-zinc-300 dark:border-zinc-400 hover:border-zinc-400'
            }`}
            onClick={handleFileSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid={importTestId}
          >
            <IconFileImport size={64} />
            <span className="mt-2 block text-sm font-semibold">
              {isDragOver ? 'Drop your environment files here' : 'Import your environments'}
            </span>
            <span className="mt-1 block text-xs text-muted">
              Drag & drop JSON files/folders or click to browse. Supports both Bruno and Postman formats.
            </span>
          </div>
        </div>
      </Modal>
    </Portal>
  );
};

export default ImportEnvironmentModal;
