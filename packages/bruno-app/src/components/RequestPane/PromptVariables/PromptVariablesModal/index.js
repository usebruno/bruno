import React, { useState, useRef } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';
import { IconAlertTriangle } from '@tabler/icons';

export default function PromptVariablesModal({ title = 'Input Required', prompts, promptVariables, onSubmit, onCancel }) {
  const [values, setValues] = useState({});
  const suggestionsRef = useRef();

  const handleChange = (prompt, value) => {
    setValues((prev) => ({ ...prev, [prompt]: value }));
  };

  const handleOnFocus = (prompt) => {
    const map = getSuggestionMap();
    if (!map.has(prompt)) return;

    const node = map.get(prompt);
    node.style.display = 'block';
  };

  const handleOnBlur = (prompt) => {
    const map = getSuggestionMap();
    if (!map.has(prompt)) return;

    const node = map.get(prompt);
    node.style.display = 'none';
  };

  const getSuggestionMap = () => {
    if (!suggestionsRef.current) {
      suggestionsRef.current = new Map();
    }

    return suggestionsRef.current;
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
          <div className="space-y-5 mt-2 mb-2">
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
                  // autoFocus removed to prevent conflicts with suggestion dropdown
                  onFocus={() => handleOnFocus(prompt)}
                  onBlur={() => handleOnBlur(prompt)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                {prompt in promptVariables
                  ? (
                      <div
                        ref={(node) => {
                          const map = getSuggestionMap();
                          map.set(prompt, node);

                          return () => {
                            map.delete(prompt);
                          };
                        }}
                        data-testid="suggestion-container"
                        className="bg-black rounded-md p-3 text-white"
                        style={{ display: 'none', cursor: 'pointer' }}
                        // If only onClick is used onBlur is triggered first
                        // Below stackoverflow comment has the solution with explaination
                        // https://stackoverflow.com/questions/17769005/onclick-and-onblur-ordering-issue/57630197#57630197
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleChange(prompt, promptVariables[prompt])}
                      >
                        <ul>
                          <li>{promptVariables[prompt]}</li>
                        </ul>
                      </div>
                    ) : null}
              </div>
            ))}
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
}
