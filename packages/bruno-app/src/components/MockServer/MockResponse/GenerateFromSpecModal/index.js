import React, { useState } from 'react';
import Modal from 'components/Modal';
import Portal from 'components/Portal';

const GenerateFromSpecModal = ({ specName, onClose, onConfirm, isGenerating }) => {
  const [generateFromSchema, setGenerateFromSchema] = useState(true);

  const handleConfirm = () => {
    onConfirm({ generateFromSchema });
  };

  return (
    <Portal>
      <Modal
        size="md"
        title="Generate from API Spec"
        confirmText={isGenerating ? 'Generating...' : 'Generate'}
        cancelText="Cancel"
        handleConfirm={handleConfirm}
        handleCancel={onClose}
        confirmDisabled={isGenerating}
        dataTestId="mock-response-generate-from-spec-modal"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed">
            Generate mock responses from
            {' '}
            <span className="font-medium">{specName || 'this API spec'}</span>
            ? Each operation status code becomes its own mock response. The lowest status code is matched first by default; add rules to route other variants.
          </p>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={generateFromSchema}
              onChange={(event) => setGenerateFromSchema(event.target.checked)}
              data-testid="mock-response-generate-from-schema-checkbox"
            />
            <span>
              Generate response bodies from schema
              <span className="block text-xs opacity-70 mt-1">
                Uses faker-backed sample data when a response schema is available. Uncheck to create empty JSON bodies.
              </span>
            </span>
          </label>
        </div>
      </Modal>
    </Portal>
  );
};

export default GenerateFromSpecModal;
