import React, { useState } from 'react';
import Modal from 'components/Modal';
import { hasUnsavedApiSpecChanges } from 'utils/api-specs';
import ApiSpecInfoCard from 'components/Sidebar/ApiSpecs/ApiSpecInfoCard';
import ApiSpecWarnings from 'components/Sidebar/ApiSpecs/ApiSpecWarnings';

const ConfirmApiSpecAction = ({
  apiSpec,
  title,
  confirmText,
  question,
  note,
  unsavedChangesMessage,
  warnings = [],
  dataTestId,
  onConfirm,
  onClose
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shownWarnings = hasUnsavedApiSpecChanges(apiSpec)
    ? [...warnings, { testId: 'api-spec-unsaved-warning', message: unsavedChangesMessage }]
    : warnings;

  const handleConfirm = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onConfirm().finally(() => setIsSubmitting(false));
  };

  return (
    <Modal
      size="sm"
      title={title}
      confirmText={confirmText}
      confirmButtonColor="danger"
      confirmDisabled={isSubmitting}
      handleConfirm={handleConfirm}
      handleCancel={onClose}
      dataTestId={dataTestId}
    >
      <p className="mb-4">{question}</p>

      <ApiSpecInfoCard apiSpec={apiSpec} />

      <p className="mt-4 text-muted text-sm">{note}</p>
      <ApiSpecWarnings warnings={shownWarnings} />
    </Modal>
  );
};

export default ConfirmApiSpecAction;
