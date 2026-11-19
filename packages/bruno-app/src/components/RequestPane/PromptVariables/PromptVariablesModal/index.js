import React, { useState } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import Select from 'ui/Select';
import { parsePromptVariable } from '@usebruno/common/utils';
import StyledWrapper from './StyledWrapper';

export default function PromptVariablesModal({ title = 'Input Required', prompts, onSubmit, onCancel }) {
  // Seed each prompt's initial value from any options marked as default with a leading `*`.
  // Multi-select values are stored as a comma-joined string, matching how they interpolate.
  const [values, setValues] = useState(() => {
    const seeded = {};
    (prompts || []).forEach((prompt) => {
      const { defaults } = parsePromptVariable(prompt);
      if (defaults.length > 0) {
        seeded[prompt] = defaults.join(',');
      }
    });
    return seeded;
  });

  const handleChange = (prompt, value) => {
    setValues((prev) => ({ ...prev, [prompt]: value }));
  };

  if (!prompts?.length) {
    return null;
  }

  const renderInput = (prompt, index) => {
    const { options, multi } = parsePromptVariable(prompt);

    if (options && multi) {
      const selected = values[prompt] ? values[prompt].split(',') : [];
      return (
        <Select
          className="mt-2"
          multiple
          data={options}
          value={selected}
          onChange={(next) => handleChange(prompt, next.join(','))}
          placeholder="Select values"
          data-testid={`prompt-variable-input-${index}`}
        />
      );
    }

    if (options) {
      return (
        <Select
          className="mt-2"
          data={options}
          value={values[prompt] || ''}
          onChange={(value) => handleChange(prompt, value || '')}
          placeholder="Select a value"
          data-testid={`prompt-variable-input-${index}`}
        />
      );
    }

    return (
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
    );
  };

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
                  {parsePromptVariable(prompt).label}
                </label>
                {renderInput(prompt, index)}
              </div>
            ))}
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
}
