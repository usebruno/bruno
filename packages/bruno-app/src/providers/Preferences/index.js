/**
 * Preferences Provider
 *
 * This provider is responsible for managing the user's preferences in the app.
 * The preferences are stored in the browser local storage.
 *
 * On start, an IPC event is published to the main process to set the preferences in the electron process.
 */

import { useEffect, createContext, useContext, useMemo } from 'react';
import * as Yup from 'yup';
import useLocalStorage from 'hooks/useLocalStorage/index';
import toast from 'react-hot-toast';

const preferencesSchema = Yup.object({
  request: Yup.object({
    sslVerification: Yup.boolean(),
    caCert: Yup.string().max(1024)
  }),
  proxy: Yup.object({
    enabled: Yup.boolean(),
    protocol: Yup.string().oneOf(['http', 'https', 'socks5']),
    hostname: Yup.string().max(1024),
    port: Yup.number().min(0).max(65535),
    auth: Yup.object({
      enabled: Yup.boolean(),
      username: Yup.string().max(1024),
      password: Yup.string().max(1024)
    }),
    noProxy: Yup.string().max(1024)
  })
});

export const PreferencesContext = createContext();
export const PreferencesProvider = (props) => {
  // TODO: Remove migration later
  const [localStorePreferences] = useLocalStorage('bruno.preferences');

  const preferences = {};
  const { ipcRenderer } = window;

  useEffect(() => {
    // TODO: Remove migration later
    if (localStorePreferences?.request) {
      console.log('migrate prefs from localStorage ' + JSON.stringify(localStorePreferences));
      ipcRenderer
        .invoke('renderer:migrate-preferences', localStorePreferences.request.sslVerification)
        .then(() => {
          localStorage.removeItem('bruno.preferences');
        })
        .catch((err) => {
          toast.error(err.message || 'Preferences sync error');
        });
    }

    const removeListener = ipcRenderer.on('main:preferences-read', (currentPreferences) => {
      if (currentPreferences.request) {
        preferences.request = currentPreferences.request;
      }
      if (currentPreferences.proxy) {
        preferences.proxy = currentPreferences.proxy;
      }
    });

    return () => {
      removeListener();
    };
  }, [preferences, toast]);

  const validatedSetPreferences = (newPreferences) => {
    return new Promise((resolve, reject) => {
      preferencesSchema
        .validate(newPreferences, { abortEarly: true })
        .then((validatedPreferences) => {
          ipcRenderer
            .invoke('renderer:set-preferences', validatedPreferences)
            .then(() => {
              preferences.request = validatedPreferences.request;
              preferences.proxy = validatedPreferences.proxy;
            })
            .catch((err) => {
              toast.error(err.message || 'Preferences sync error');
            });
          resolve(validatedPreferences);
        })
        .catch((error) => {
          let errMsg = error.message || 'Preferences validation error';
          toast.error(errMsg);
          reject(error);
        });
    });
  };

  const value = useMemo(
    () => ({
      preferences,
      setPreferences: validatedSetPreferences
    }),
    [preferences, validatedSetPreferences]
  );

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
