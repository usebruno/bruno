import React, { useState } from 'react';
import Modal from 'components/Modal';
import { IconAlertTriangle } from '@tabler/icons';
import { hasUnsavedApiSpecChanges } from 'utils/api-specs';
import ApiSpecInfoCard from 'components/Sidebar/ApiSpecs/ApiSpecInfoCard';
import StyledWrapper from './StyledWrapper';

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
      <StyledWrapper>
        <p className="mb-4">{question}</p>

        <ApiSpecInfoCard apiSpec={apiSpec} />

        <p className="mt-4 text-muted text-sm">{note}</p>
        {shownWarnings.map(({ testId, message }) => (
          <div key={testId} className="warning-banner flex items-start gap-2 mt-4 px-3 py-2" data-testid={testId}>
            <span className="warning-icon flex items-center flex-shrink-0">
              <IconAlertTriangle size={18} strokeWidth={1.5} />
            </span>
            <span>{message}</span>
          </div>
        ))}
      </StyledWrapper>
    </Modal>
  );
};

export default ConfirmApiSpecAction;
