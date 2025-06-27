import { useEffect } from 'react';
import {
  showPreferences,
  updateCookies,
  updatePreferences,
  updateSystemProxyEnvVariables
} from 'providers/ReduxStore/slices/app';
import {
  brunoConfigUpdateEvent,
  collectionAddDirectoryEvent,
  collectionAddFileEvent,
  collectionChangeFileEvent,
  collectionRenamedEvent,
  collectionUnlinkDirectoryEvent,
  collectionUnlinkEnvFileEvent,
  collectionUnlinkFileEvent,
  processEnvUpdateEvent,
  runFolderEvent,
  runRequestEvent,
  scriptEnvironmentUpdateEvent
} from 'providers/ReduxStore/slices/collections';
import { collectionAddEnvFileEvent, openCollectionEvent, hydrateCollectionWithUiStateSnapshot } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import { globalEnvironmentsUpdateEvent, updateGlobalEnvironments } from 'providers/ReduxStore/slices/global-environments';
import { collectionAddOauth2CredentialsByUrl } from 'providers/ReduxStore/slices/collections/index';
import { saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';

const useIpcEvents = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    const { ipcRenderer } = window;

    const _collectionTreeUpdated = (type, val) => {
      if (window.__IS_DEV__) {
        console.log(type);
        console.log(val);
      }
      if (type === 'addDir') {
        dispatch(
          collectionAddDirectoryEvent({
            dir: val
          })
        );
      }
      if (type === 'addFile') {
        dispatch(
          collectionAddFileEvent({
            file: val
          })
        );
      }
      if (type === 'change') {
        dispatch(
          collectionChangeFileEvent({
            file: val
          })
        );
      }
      if (type === 'unlink') {
        setTimeout(() => {
          dispatch(
            collectionUnlinkFileEvent({
              file: val
            })
          );
        }, 100);
      }
      if (type === 'unlinkDir') {
        dispatch(
          collectionUnlinkDirectoryEvent({
            directory: val
          })
        );
      }
      if (type === 'addEnvironmentFile') {
        dispatch(collectionAddEnvFileEvent(val));
      }
      if (type === 'unlinkEnvironmentFile') {
        dispatch(collectionUnlinkEnvFileEvent(val));
      }
    };

    ipcRenderer.invoke('renderer:ready');

    const removeCollectionTreeUpdateListener = ipcRenderer.on('main:collection-tree-updated', _collectionTreeUpdated);

    const removeOpenCollectionListener = ipcRenderer.on('main:collection-opened', (pathname, uid, brunoConfig) => {
      dispatch(openCollectionEvent(uid, pathname, brunoConfig));
    });

    const removeCollectionAlreadyOpenedListener = ipcRenderer.on('main:collection-already-opened', (pathname) => {
      toast.success('Collection is already opened');
    });

    const removeDisplayErrorListener = ipcRenderer.on('main:display-error', (error) => {
      if (typeof error === 'string') {
        return toast.error(error || 'Something went wrong!');
      }
      if (typeof error === 'object') {
        return toast.error(error.message || 'Something went wrong!');
      }
    });

    const removeScriptEnvUpdateListener = ipcRenderer.on('main:script-environment-update', (val) => {
      dispatch(scriptEnvironmentUpdateEvent(val));
      // Persist the environment variable changes to disk
      if (val && val.collectionUid) {
        // Find the active environment UID from the Redux state
        const state = window.store.getState();
        const collection = state.collections.collections.find(c => c.uid === val.collectionUid);
        if (collection && collection.activeEnvironmentUid) {
          const activeEnv = collection.environments.find(e => e.uid === collection.activeEnvironmentUid);
          if (activeEnv) {
            // Merge updated variables from val.envVariables into the environment
            const updatedVars = activeEnv.variables.map(v => {
              if (val.envVariables && Object.prototype.hasOwnProperty.call(val.envVariables, v.name)) {
                return { ...v, value: val.envVariables[v.name] };
              }
              return v;
            });
            // Add any new variables
            Object.keys(val.envVariables || {}).forEach(key => {
              if (!updatedVars.find(v => v.name === key) && key !== '__name__') {
                updatedVars.push({
                  name: key,
                  value: val.envVariables[key],
                  secret: false,
                  enabled: true,
                  type: 'text',
                  uid: (window.uuid ? window.uuid() : key + Date.now())
                });
              }
            });
            dispatch(saveEnvironment(updatedVars, activeEnv.uid, collection.uid));
          }
        }
      }
    });

    const removeGlobalEnvironmentVariablesUpdateListener = ipcRenderer.on('main:global-environment-variables-update', (val) => {
      dispatch(globalEnvironmentsUpdateEvent(val));
    });

    const removeCollectionRenamedListener = ipcRenderer.on('main:collection-renamed', (val) => {
      dispatch(collectionRenamedEvent(val));
    });

    const removeRunFolderEventListener = ipcRenderer.on('main:run-folder-event', (val) => {
      dispatch(runFolderEvent(val));
    });

    const removeRunRequestEventListener = ipcRenderer.on('main:run-request-event', (val) => {
      dispatch(runRequestEvent(val));
    });

    const removeProcessEnvUpdatesListener = ipcRenderer.on('main:process-env-update', (val) => {
      dispatch(processEnvUpdateEvent(val));
    });

    const removeConsoleLogListener = ipcRenderer.on('main:console-log', (val) => {
      console[val.type](...val.args);
    });

    const removeConfigUpdatesListener = ipcRenderer.on('main:bruno-config-update', (val) =>
      dispatch(brunoConfigUpdateEvent(val))
    );

    const removeShowPreferencesListener = ipcRenderer.on('main:open-preferences', () => {
      dispatch(showPreferences(true));
    });

    const removePreferencesUpdatesListener = ipcRenderer.on('main:load-preferences', (val) => {
      dispatch(updatePreferences(val));
    });

    const removeSystemProxyEnvUpdatesListener = ipcRenderer.on('main:load-system-proxy-env', (val) => {
      dispatch(updateSystemProxyEnvVariables(val));
    });

    const removeCookieUpdateListener = ipcRenderer.on('main:cookies-update', (val) => {
      dispatch(updateCookies(val));
    });

    const removeGlobalEnvironmentsUpdatesListener = ipcRenderer.on('main:load-global-environments', (val) => {
      dispatch(updateGlobalEnvironments(val));
    });

    const removeSnapshotHydrationListener = ipcRenderer.on('main:hydrate-app-with-ui-state-snapshot', (val) => {
      dispatch(hydrateCollectionWithUiStateSnapshot(val));
    });

    const removeCollectionOauth2CredentialsUpdatesListener = ipcRenderer.on('main:credentials-update', (val) => {
      const payload = {
        ...val,
        itemUid: val.itemUid || null,
        folderUid: val.folderUid || null,
        credentialsId: val.credentialsId || 'credentials'
      };
      dispatch(collectionAddOauth2CredentialsByUrl(payload));
    });

    return () => {
      removeCollectionTreeUpdateListener();
      removeOpenCollectionListener();
      removeCollectionAlreadyOpenedListener();
      removeDisplayErrorListener();
      removeScriptEnvUpdateListener();
      removeGlobalEnvironmentVariablesUpdateListener();
      removeCollectionRenamedListener();
      removeRunFolderEventListener();
      removeRunRequestEventListener();
      removeProcessEnvUpdatesListener();
      removeConsoleLogListener();
      removeConfigUpdatesListener();
      removeShowPreferencesListener();
      removePreferencesUpdatesListener();
      removeCookieUpdateListener();
      removeSystemProxyEnvUpdatesListener();
      removeGlobalEnvironmentsUpdatesListener();
      removeSnapshotHydrationListener();
      removeCollectionOauth2CredentialsUpdatesListener();
    };
  }, [isElectron]);
};

export default useIpcEvents;
