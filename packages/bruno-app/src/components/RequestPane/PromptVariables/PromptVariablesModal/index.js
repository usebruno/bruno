import React, { useState } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';

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
        size="md"
        title={title}
        confirmText="Continue"
        cancelText="Cancel"
        handleConfirm={() => onSubmit(values)}
        handleCancel={onCancel}
      >
        {prompts.map((prompt) => (
          <div key={prompt} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>{prompt}:</label>
            <input
              type="text"
              style={{ width: '100%', color: '#333', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              value={values[prompt] || ''}
              onChange={(e) => handleChange(prompt, e.target.value)}
              autoFocus
            />
          </div>
        ))}
      </Modal>
    </Portal>
  );
}
