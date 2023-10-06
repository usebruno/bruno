/**
 * Preferences Provider
 *
 * This provider is responsible for managing the user's preferences in the app.
 * The preferences are stored in the browser local storage.
 *
 * On start, an IPC event is published to the main process to set the preferences in the electron process.
 */

import { useEffect, createContext, useContext } from 'react';
import * as Yup from 'yup';
import useLocalStorage from 'hooks/useLocalStorage/index';
import toast from 'react-hot-toast';

const defaultPreferences = {
  request: {
    sslVerification: true
  }
};

const preferencesSchema = Yup.object().shape({
  request: Yup.object().shape({
    sslVerification: Yup.boolean()
  })
});

export const PreferencesContext = createContext();
export const PreferencesProvider = (props) => {
  const [preferences, setPreferences] = useLocalStorage('bruno.preferences', defaultPreferences);
  const { ipcRenderer } = window;

  useEffect(() => {
    if (window && window.ipcRenderer) {
      window.ipcRenderer.invoke('renderer:set-preferences', preferences).catch((err) => {
        toast.error(err.message || 'Preferences sync error');
      });
    }
  }, [preferences, toast]);

  const validatedSetPreferences = (newPreferences) => {
    return new Promise((resolve, reject) => {
      preferencesSchema
        .validate(newPreferences, { abortEarly: true })
        .then((validatedPreferences) => {
          setPreferences(validatedPreferences);
          resolve(validatedPreferences);
        })
        .catch((error) => {
          let errMsg = error.message || 'Preferences validation error';
          toast.error(errMsg);
          reject(error);
        });
    });
  };

  // todo: setPreferences must validate the preferences object against a schema
  const value = {
    preferences,
    setPreferences: validatedSetPreferences
  };

  return (
    <PreferencesContext.Provider value={value}>
      <>{props.children}</>
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);

  if (context === undefined) {
    throw new Error(`usePreferences must be used within a PreferencesProvider`);
  }

  return context;
};

export default PreferencesProvider;
