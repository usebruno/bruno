import { useEffect } from 'react';
import { showPreferences, updateCookies, updatePreferences } from 'providers/ReduxStore/slices/app';
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
import { collectionAddEnvFileEvent, openCollectionEvent } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import { showCloneRequest, showNewRequest } from 'providers/ReduxStore/slices/tabs';

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
      if (typeof message === 'object') {
        return toast.error(error.message || 'Something went wrong!');
      }
    });

    const removeScriptEnvUpdateListener = ipcRenderer.on('main:script-environment-update', (val) => {
      dispatch(scriptEnvironmentUpdateEvent(val));
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

    const removeCookieUpdateListener = ipcRenderer.on('main:cookies-update', (val) => {
      dispatch(updateCookies(val));
    });

    const tabContextMenuCommands = ipcRenderer.on('main:tab-context-menu-commands', (event, tab) => {
      switch (event) {
        case 'close-tab':
          // TODO: close tab
          break;
        case 'clone-request':
          dispatch(showCloneRequest(tab));
          break;
        case 'new-request':
          dispatch(showNewRequest(true));
          break;
      }
    });

    return () => {
      removeCollectionTreeUpdateListener();
      removeOpenCollectionListener();
      removeCollectionAlreadyOpenedListener();
      removeDisplayErrorListener();
      removeScriptEnvUpdateListener();
      removeCollectionRenamedListener();
      removeRunFolderEventListener();
      removeRunRequestEventListener();
      removeProcessEnvUpdatesListener();
      removeConsoleLogListener();
      removeConfigUpdatesListener();
      removeShowPreferencesListener();
      removePreferencesUpdatesListener();
      removeCookieUpdateListener();
      tabContextMenuCommands();
    };
  }, [isElectron]);
};

export default useIpcEvents;
