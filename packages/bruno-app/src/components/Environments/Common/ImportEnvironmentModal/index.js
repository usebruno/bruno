import React from 'react';
import UploadStep from './UploadStep';
import ReviewStep from './ReviewStep';
import ResolutionStep from './ResolutionStep';
import { useEnvironmentImport, IMPORT_STEPS } from './hooks/useEnvironmentImport';

const ImportEnvironmentModal = ({ type = 'collection', collection, onClose, onEnvironmentCreated }) => {
  const isGlobal = type === 'global';

  const {
    step,
    items,
    selected,
    setSelected,
    resolutions,
    setResolutions,
    setStep,
    handleImportEnvironment,
    handleConfirmImport
  } = useEnvironmentImport(type, collection, onClose, onEnvironmentCreated);

  if (!isGlobal && !collection) {
    console.error('ImportEnvironmentModal: collection prop is required when type is "collection"');
    return null;
  }
  const modalTitle = isGlobal ? 'Import Global Environment' : 'Import Environment';
  const modalTestId = isGlobal ? 'import-global-environment-modal' : 'import-environment-modal';
  const importTestId = isGlobal ? 'import-global-environment' : 'import-environment';

  if (step === IMPORT_STEPS.UPLOAD) {
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

  if (step === IMPORT_STEPS.REVIEW) {
    return (
      <ReviewStep
        modalTitle={modalTitle}
        modalTestId={modalTestId}
        onClose={onClose}
        handleConfirmImport={handleConfirmImport}
        items={items}
        selected={selected}
        setSelected={setSelected}
      />
    );
  }

  if (step === IMPORT_STEPS.RESOLUTION) {
    return (
      <ResolutionStep
        modalTitle={modalTitle}
        modalTestId={modalTestId}
        onBack={() => setStep(IMPORT_STEPS.REVIEW)}
        handleConfirmImport={handleConfirmImport}
        items={items}
        selected={selected}
        resolutions={resolutions}
        setResolutions={setResolutions}
      />
    );
  }

  return null;
};

export default ImportEnvironmentModal;
