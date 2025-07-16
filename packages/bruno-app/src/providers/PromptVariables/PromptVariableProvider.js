import React, { createContext, useCallback, useContext, useState } from 'react';
import { toast } from 'react-hot-toast';
import PromptVariableModal from '../../components/Modal/PromptVariableModal';

const PromptVariableContext = createContext();

export function usePromptVariable() {
  return useContext(PromptVariableContext);
}


export function PromptVariableProvider({ children }) {
  const [modalState, setModalState] = useState({ open: false, prompts: [], resolve: null, reject: null });

  const prompt = useCallback((prompts) => {
    return new Promise((resolve, reject) => {
      try {
        setModalState({ open: true, prompts, resolve, reject });
      } catch (err) {
        console.error('PromptVariableProvider: Error opening prompt modal:', err);
        toast.error('Prompt variable(s) detected, but prompt modal is not available. Please ensure PromptVariableProvider is mounted.');				
        reject(err);
      }
    });
  }, []);

  // Expose globally for non-component code (e.g., Redux thunks)
  if (typeof window !== 'undefined') {
    window.promptForVariables = async (prompts) => {
      try {
        return await prompt(prompts);
      } catch (err) {
        console.error('window.promptForVariables: Error:', err);
        throw err;
      }
    };
  }

  const handleSubmit = (values) => {
    try {
      modalState.resolve(values);
    } catch (err) {
      console.error('PromptVariableProvider: Error resolving prompt values:', err);
    }
    setModalState({ open: false, prompts: [], resolve: null, reject: null });
  };

  const handleCancel = () => {
    try {
      modalState.reject();
    } catch (err) {
      console.error('PromptVariableProvider: Error rejecting prompt:', err);
    }
    setModalState({ open: false, prompts: [], resolve: null, reject: null });
  };

  try {
    return (
      <PromptVariableContext.Provider value={{ prompt }}>
        {children}
        {modalState.open && (
          <PromptVariableModal
            title="Input Required"
            prompts={modalState.prompts}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}
      </PromptVariableContext.Provider>
    );
  } catch (err) {
    console.error('PromptVariableProvider: Error rendering provider or modal:', err);
    return children;
  }
}
