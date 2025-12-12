import React, { useState } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';
import { IconAlertTriangle } from '@tabler/icons';

export default function PromptVariablesModal({ title = 'Input Required', prompts, onSubmit, onCancel }) {
  const [values, setValues] = useState({});

  const handleChange = (prompt, value) => {
    setValues((prev) => ({ ...prev, [prompt]: value }));
  };

  if (!prompts?.length) {
    return null;
  }

  return (
    <Portal>
      <Modal
        size="lg"
        title={title}
        confirmText="Continue"
        cancelText="Cancel"
        handleConfirm={() => onSubmit(values)}
        handleCancel={onCancel}
      >
        <StyledWrapper data-testid="prompt-variables-modal-content">
          <div className="space-y-5 mt-2">
            {prompts.map((prompt, index) => (
              <div key={prompt} data-testid="prompt-variable-input-container">
                <label htmlFor={`prompt-${index}`} className="block font-medium">
                  {prompt}
                </label>
                <input
                  id={`prompt-${index}`}
                  type="text"
                  data-testid={`prompt-variable-input-${index}`}
                  className="textbox mt-2 w-full"
                  placeholder="Enter value"
                  value={values[prompt] || ''}
                  onChange={(e) => handleChange(prompt, e.target.value)}
                  autoFocus={index === 0}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
            ))}
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
}
