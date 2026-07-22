import React, { useEffect, useRef } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';

const RenameMockResponseModal = ({
  response,
  onClose,
  onConfirm,
  isSaving = false
}) => {
  const inputRef = useRef();
  const [name, setName] = React.useState(response?.name || '');

  useEffect(() => {
    setName(response?.name || '');
  }, [response?.name]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleConfirm = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
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
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleConfirm();
              }
            }}
            data-testid="mock-response-rename-name-input"
          />
        </div>
      </Modal>
    </Portal>
  );
};

export default RenameMockResponseModal;
