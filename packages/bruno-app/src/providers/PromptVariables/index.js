import PromptVariablesModal from 'components/RequestPane/PromptVariables/PromptVariablesModal';
import useLocalStorage from 'hooks/useLocalStorage';
import React, { createContext, useCallback, useState } from 'react';

const PromptVariablesContext = createContext();

export function PromptVariablesProvider({ children }) {
  const [modalState, setModalState] = useState({ open: false, prompts: [], resolve: null, reject: null });
  const [promptVariables, setPromptVariables] = useLocalStorage('promptVariables', {});

  const prompt = useCallback((prompts) => {
    return new Promise((resolve, reject) => {
      setModalState({ open: true, prompts, resolve, reject });
    });
  }, []);

  // Expose globally for non-component code (e.g., Redux thunks)
  if (typeof window !== 'undefined') {
    window.promptForVariables = async (prompts) => {
      try {
        return await prompt(prompts);
      } catch (err) {
        if (err !== 'cancelled') console.error('window.promptForVariables encountered an error:', err);
        throw err;
      }
    };
  }

  const handleSubmit = (values) => {
    setPromptVariables((prev) => ({ ...prev, ...values }));
    modalState.resolve(values);
    setModalState({ open: false, prompts: [], resolve: null, reject: null });
  };

  const handleCancel = () => {
    modalState.reject('cancelled');
    setModalState({ open: false, prompts: [], resolve: null, reject: null });
  };

  return (
    <PromptVariablesContext.Provider value={{ prompt }}>
      {children}
      {modalState.open && (
        <PromptVariablesModal
          title="Input Required"
          prompts={modalState.prompts}
          promptVariables={promptVariables}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </PromptVariablesContext.Provider>
  );
}

export default PromptVariablesProvider;
