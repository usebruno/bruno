import React, { useState } from 'react';
import Modal from 'components/Modal';
import Portal from 'components/Portal';

const CreateExampleModal = ({ isOpen, onClose, onSave, title = 'Create Response Example' }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

  const handleNameBlur = () => {
    if (!name.trim()) {
      setNameError('Example name is required');
    } else {
      setNameError('');
    }
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    // Clear error when user starts typing
    if (nameError) {
      setNameError('');
    }
  };

  const handleConfirm = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim());
      // Reset form
      setName('');
      setDescription('');
      setNameError('');
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setName('');
    setDescription('');
    setNameError('');
    onClose();
  };

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setNameError('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <Portal>
      <Modal
        size="md"
        title={title}
        handleCancel={handleClose}
        handleConfirm={handleConfirm}
        confirmText="Create Example"
        cancelText="Cancel"
        confirmDisabled={!name.trim()}
        isOpen={isOpen}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="exampleName" className="block font-semibold">
              Example Name<span className="text-red-600">*</span>
            </label>
            <input
              id="exampleName"
              type="text"
              className="textbox mt-2 w-full"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              autoFocus
              required
              data-testid="create-example-name-input"
            />
            {nameError && (
              <div className="text-red-500 text-sm mt-1" data-testid="name-error">
                {nameError}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="exampleDescription" className="block font-semibold">
              Description
            </label>
            <textarea
              id="exampleDescription"
              className="textbox mt-2 w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="create-example-description-input"
            />
          </div>
        </div>
      </Modal>
    </Portal>
  );
};

export default CreateExampleModal;
