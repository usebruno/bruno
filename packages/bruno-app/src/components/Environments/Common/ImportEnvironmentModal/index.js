import React from 'react';
import UploadStep from './UploadStep';
import ReviewStep from './ReviewStep';
import { useEnvironmentImport } from './hooks/useEnvironmentImport';

const ImportEnvironmentModal = ({ type = 'collection', collection, onClose, onEnvironmentCreated }) => {
  const isGlobal = type === 'global';

  if (!isGlobal && !collection) {
    console.error('ImportEnvironmentModal: collection prop is required when type is "collection"');
    return null;
  }
  const modalTitle = isGlobal ? 'Import Global Environment' : 'Import Environment';
  const modalTestId = isGlobal ? 'import-global-environment-modal' : 'import-environment-modal';
  const importTestId = isGlobal ? 'import-global-environment' : 'import-environment';

  const {
    step,
    parsedData,
    selectedIndices,
    setSelectedIndices,
    resolutions,
    setResolutions,
    handleImportEnvironment,
    handleConfirmImport
  } = useEnvironmentImport(type, collection, onClose, onEnvironmentCreated);

  if (step === 'UPLOAD') {
    return (
      <UploadStep
        modalTitle={modalTitle}
        modalTestId={modalTestId}
        importTestId={importTestId}
        onClose={onClose}
        handleImportEnvironment={handleImportEnvironment}
      />
    );
  }

  return (
    <ReviewStep
      modalTitle={modalTitle}
      modalTestId={modalTestId}
      onClose={onClose}
      handleConfirmImport={handleConfirmImport}
      parsedData={parsedData}
      selectedIndices={selectedIndices}
      setSelectedIndices={setSelectedIndices}
      resolutions={resolutions}
      setResolutions={setResolutions}
    />
  );
};

export default ImportEnvironmentModal;
