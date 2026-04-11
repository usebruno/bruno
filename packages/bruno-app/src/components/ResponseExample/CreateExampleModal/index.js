import { useState, useEffect } from 'react';
import Modal from 'components/Modal';
import Portal from 'components/Portal';

const STATUS_CODES = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];
const BODY_TYPES = [
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'xml', label: 'XML' },
  { value: 'html', label: 'HTML' }
];

const CreateExampleModal = ({ isOpen, onClose, onSave, title = 'Create Response Example', initialName = '', showMockFields = false }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [statusCode, setStatusCode] = useState(200);
  const [bodyType, setBodyType] = useState('json');

  const handleNameChange = (e) => {
    setName(e.target.value);
    // Clear error when user starts typing
    if (nameError) {
      setNameError('');
    }
  };

  const handleConfirm = () => {
    if (name.trim()) {
      if (showMockFields) {
        onSave(name.trim(), description.trim(), { statusCode: Number(statusCode), bodyType });
      } else {
        onSave(name.trim(), description.trim());
      }
      // Reset form
      setName('');
      setDescription('');
      setNameError('');
      setStatusCode(200);
      setBodyType('json');
    } else {
      setNameError('Example name is required');
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setName('');
    setDescription('');
    setNameError('');
    setStatusCode(200);
    setBodyType('json');
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription('');
      setNameError('');
      setStatusCode(200);
      setBodyType('json');
    }
  }, [isOpen, initialName]);

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
        isOpen={isOpen}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="exampleName" className="block font-medium">
              Example Name<span className="text-red-600">*</span>
            </label>
            <input
              id="exampleName"
              type="text"
              className="textbox mt-2 w-full"
              value={name}
              onChange={handleNameChange}
              autoFocus
              required
              data-testid="create-example-name-input"
            />
            {nameError && (
              <div className="text-red-500 mt-1" data-testid="name-error">
                {nameError}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="exampleDescription" className="block font-medium">
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

          {showMockFields && (
            <>
              <div>
                <label htmlFor="statusCode" className="block font-medium">
                  Status Code
                </label>
                <select
                  id="statusCode"
                  className="textbox mt-2 w-full"
                  value={statusCode}
                  onChange={(e) => setStatusCode(e.target.value)}
                >
                  {STATUS_CODES.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bodyType" className="block font-medium">
                  Body Type
                </label>
                <select
                  id="bodyType"
                  className="textbox mt-2 w-full"
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                >
                  {BODY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </Modal>
    </Portal>
  );
};

export default CreateExampleModal;
