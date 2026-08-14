import { useEffect, useRef, useState } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import {
  getMockResponseNameError,
  getMockResponseNameLengthError,
  isMockResponseNameTaken
} from 'utils/mock-server/mock-responses';

const RenameMockResponseModal = ({
  response,
  existingResponses = [],
  onClose,
  onConfirm,
  isSaving = false
}) => {
  const inputRef = useRef();
  const [name, setName] = useState(response?.name || '');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleConfirm = () => {
    const trimmedName = name.trim();

    const validationError = getMockResponseNameError(trimmedName);
    if (validationError) {
      setNameError(validationError);
      return;
    }

    if (isMockResponseNameTaken(existingResponses, trimmedName, response?.uid)) {
      setNameError('A mock response with this name already exists');
      return;
    }

    onConfirm(trimmedName);
  };

  return (
    <Portal>
      <Modal
        size="sm"
        title="Rename Mock Response"
        confirmText={isSaving ? 'Renaming...' : 'Rename'}
        cancelText="Cancel"
        handleConfirm={handleConfirm}
        handleCancel={onClose}
        confirmDisabled={isSaving || !name.trim()}
        dataTestId="rename-mock-response-modal"
      >
        <div>
          <label htmlFor="mock-response-rename-name" className="block font-medium">
            Name
          </label>
          <input
            id="mock-response-rename-name"
            ref={inputRef}
            type="text"
            className="textbox mt-2 w-full"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(getMockResponseNameLengthError(event.target.value) || '');
            }}
            data-testid="mock-response-rename-name-input"
          />
          {nameError ? (
            <div className="text-red-500 mt-1">{nameError}</div>
          ) : null}
        </div>
      </Modal>
    </Portal>
  );
};

export default RenameMockResponseModal;
