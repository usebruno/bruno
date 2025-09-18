import React, { useState } from 'react';
import Modal from 'components/Modal';

const CreateExampleModal = ({ isOpen, onClose, onSave, title = 'Create Response Example' }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleConfirm = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim());
      // Reset form
      setName('');
      setDescription('');
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setName('');
    setDescription('');
    onClose();
  };

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      size="sm"
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
            Example Name
          </label>
          <input
            id="exampleName"
            type="text"
            className="textbox mt-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter example name..."
            autoFocus
            required
            data-testid="create-example-name-input"
          />
        </div>

        <div>
          <label htmlFor="exampleDescription" className="block font-semibold">
            Description (Optional)
          </label>
          <textarea
            id="exampleDescription"
            className="textbox mt-2 w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter example description..."
            rows={3}
            data-testid="create-example-description-input"
          />
        </div>
      </div>
    </Modal>
  );
};

export default CreateExampleModal;
