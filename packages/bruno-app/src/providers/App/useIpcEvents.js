import { useEffect } from 'react';
import {
  updateCookies,
  updatePreferences,
  setGitVersion
} from 'providers/ReduxStore/slices/app';
import {
  addTab
} from 'providers/ReduxStore/slices/tabs';
import {
  brunoConfigUpdateEvent,
  collectionAddDirectoryEvent,
  collectionAddFileEvent,
  collectionBatchAddItems,
  collectionChangeFileEvent,
  collectionRenamedEvent,
  collectionUnlinkDirectoryEvent,
  collectionUnlinkEnvFileEvent,
  collectionUnlinkFileEvent,
  processEnvUpdateEvent,
  workspaceEnvUpdateEvent,
  requestCancelled,
  runFolderEvent,
  runRequestEvent,
  scriptEnvironmentUpdateEvent,
  streamDataReceived,
  setDotEnvVariables
} from 'providers/ReduxStore/slices/collections';
import { collectionAddEnvFileEvent, openCollectionEvent, hydrateCollectionWithUiStateSnapshot, mergeAndPersistEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import {
  workspaceOpenedEvent,
  workspaceConfigUpdatedEvent
} from 'providers/ReduxStore/slices/workspaces/actions';
import { workspaceDotEnvUpdateEvent, setWorkspaceDotEnvVariables } from 'providers/ReduxStore/slices/workspaces';
import toast from 'react-hot-toast';
import { useDispatch, useStore } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import { globalEnvironmentsUpdateEvent, updateGlobalEnvironments } from 'providers/ReduxStore/slices/global-environments';
import { collectionAddOauth2CredentialsByUrl, collectionClearOauth2CredentialsByCredentialsId, updateCollectionLoadingState } from 'providers/ReduxStore/slices/collections/index';
import { addLog } from 'providers/ReduxStore/slices/logs';
import { updateSystemResources } from 'providers/ReduxStore/slices/performance';
import { apiSpecAddFileEvent, apiSpecChangeFileEvent } from 'providers/ReduxStore/slices/apiSpec';

const useIpcEvents = () => {
  const dispatch = useDispatch();
  const store = useStore();

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

    // Batch handler for collection tree updates (performance optimization)
    // Uses a single Redux dispatch to process all items, avoiding multiple re-renders
    const _collectionTreeBatchUpdated = (batch) => {
      if (!batch || !Array.isArray(batch) || batch.length === 0) {
        return;
      }

      if (window.__IS_DEV__) {
        console.log('Batch update received:', batch.length, 'items');
      }

      // Separate batch items into those that can be bulk-processed vs those that need individual handling
      const bulkItems = []; // addFile, addDir - can be processed in single reducer
      const individualItems = []; // change, unlink, etc - need individual dispatches

      batch.forEach(({ eventType, payload }) => {
        if (eventType === 'addDir' || eventType === 'addFile') {
          bulkItems.push({ eventType, payload });
        } else {
          individualItems.push({ eventType, payload });
        }
      });

      // Process bulk items in a single dispatch (addFile and addDir)
      if (bulkItems.length > 0) {
        dispatch(collectionBatchAddItems({ items: bulkItems }));
      }

      // Process remaining items individually (these are typically rare during mount)
      individualItems.forEach(({ eventType, payload }) => {
        if (eventType === 'change') {
          dispatch(collectionChangeFileEvent({ file: payload }));
        } else if (eventType === 'unlink') {
          dispatch(collectionUnlinkFileEvent({ file: payload }));
        } else if (eventType === 'unlinkDir') {
          dispatch(collectionUnlinkDirectoryEvent({ directory: payload }));
        } else if (eventType === 'addEnvironmentFile') {
          dispatch(collectionAddEnvFileEvent(payload));
        } else if (eventType === 'unlinkEnvironmentFile') {
          dispatch(collectionUnlinkEnvFileEvent(payload));
        }
      });
    };

    const _apiSpecTreeUpdated = (type, val) => {
      if (window.__IS_DEV__) {
        console.log('API Spec update:', type);
        console.log(val);
      }
      if (type === 'addFile') {
        dispatch(apiSpecAddFileEvent({ data: val }));
      }
      if (type === 'changeFile') {
        dispatch(apiSpecChangeFileEvent({ data: val }));
      }
    };

    ipcRenderer.invoke('renderer:ready');

    const removeCollectionTreeUpdateListener = ipcRenderer.on('main:collection-tree-updated', _collectionTreeUpdated);

    const removeCollectionTreeBatchUpdateListener = ipcRenderer.on('main:collection-tree-batch-updated', _collectionTreeBatchUpdated);

    const removeApiSpecTreeUpdateListener = ipcRenderer.on('main:apispec-tree-updated', _apiSpecTreeUpdated);

    const removeOpenCollectionListener = ipcRenderer.on('main:collection-opened', (pathname, uid, brunoConfig) => {
      dispatch(openCollectionEvent(uid, pathname, brunoConfig));
    });

    const removeOpenWorkspaceListener = ipcRenderer.on('main:workspace-opened', (workspacePath, workspaceUid, workspaceConfig) => {
      dispatch(workspaceOpenedEvent(workspacePath, workspaceUid, workspaceConfig));
    });

    const removeWorkspaceConfigUpdatedListener = ipcRenderer.on('main:workspace-config-updated', (workspacePath, workspaceUid, workspaceConfig) => {
      dispatch(workspaceConfigUpdatedEvent(workspacePath, workspaceUid, workspaceConfig));
    });

    const removeWorkspaceEnvironmentAddedListener = ipcRenderer.on('main:workspace-environment-added', (workspaceUid, file) => {
      const state = store.getState();
      const activeWorkspaceUid = state.workspaces?.activeWorkspaceUid;
      if (activeWorkspaceUid === workspaceUid) {
        const workspace = state.workspaces?.workspaces?.find((w) => w.uid === workspaceUid);
        if (workspace) {
          ipcRenderer.invoke('renderer:get-global-environments', {
            workspaceUid,
            workspacePath: workspace.pathname
          }).then((result) => {
            dispatch(updateGlobalEnvironments(result));
          }).catch((error) => {
            console.error('Error refreshing global environments:', error);
          });
        }
      }
    });

    const removeWorkspaceEnvironmentChangedListener = ipcRenderer.on('main:workspace-environment-changed', (workspaceUid, file) => {
      const state = store.getState();
      const activeWorkspaceUid = state.workspaces?.activeWorkspaceUid;
      if (activeWorkspaceUid === workspaceUid) {
        const workspace = state.workspaces?.workspaces?.find((w) => w.uid === workspaceUid);
        if (workspace) {
          ipcRenderer.invoke('renderer:get-global-environments', {
            workspaceUid,
            workspacePath: workspace.pathname
          }).then((result) => {
            dispatch(updateGlobalEnvironments(result));
          }).catch((error) => {
            console.error('Error refreshing global environments:', error);
          });
        }
      }
    });

    const removeWorkspaceEnvironmentDeletedListener = ipcRenderer.on('main:workspace-environment-deleted', (workspaceUid, environmentUid) => {
      const state = store.getState();
      const activeWorkspaceUid = state.workspaces?.activeWorkspaceUid;
      if (activeWorkspaceUid === workspaceUid) {
        const workspace = state.workspaces?.workspaces?.find((w) => w.uid === workspaceUid);
        if (workspace) {
          ipcRenderer.invoke('renderer:get-global-environments', {
            workspaceUid,
            workspacePath: workspace.pathname
          }).then((result) => {
            dispatch(updateGlobalEnvironments(result));
          }).catch((error) => {
            console.error('Error refreshing global environments:', error);
          });
        }
      }
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
    });

    const removePersistentEnvVariablesUpdateListener = ipcRenderer.on('main:persistent-env-variables-update', (val) => {
      dispatch(mergeAndPersistEnvironment(val));
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

    const removeWorkspaceDotEnvUpdatesListener = ipcRenderer.on('main:workspace-dotenv-update', (val) => {
      dispatch(workspaceDotEnvUpdateEvent(val));
      dispatch(workspaceEnvUpdateEvent({ processEnvVariables: val.processEnvVariables }));
    });

    const removeDotEnvFileUpdateListener = ipcRenderer.on('main:dotenv-file-update', (val) => {
      const { type, collectionUid, workspaceUid, filename, variables, exists, processEnvVariables } = val;

      if (type === 'collection' && collectionUid) {
        dispatch(setDotEnvVariables({
          collectionUid,
          variables,
          exists,
          filename
        }));
        if (filename === '.env') {
          dispatch(processEnvUpdateEvent({ collectionUid, processEnvVariables }));
        }
      } else if (type === 'workspace' && workspaceUid) {
        dispatch(setWorkspaceDotEnvVariables({
          workspaceUid,
          variables,
          exists,
          filename
        }));
        if (filename === '.env') {
          dispatch(workspaceDotEnvUpdateEvent(val));
          dispatch(workspaceEnvUpdateEvent({ processEnvVariables }));
        }
      }
    });

    const removeConsoleLogListener = ipcRenderer.on('main:console-log', (val) => {
      console[val.type](...val.args);
      dispatch(addLog({
        type: val.type,
        args: val.args,
        timestamp: new Date().toISOString()
      }));
    });

    const removeSystemResourcesListener = ipcRenderer.on('main:filesync-system-resources', (resourceData) => {
      dispatch(updateSystemResources(resourceData));
    });

    const removeConfigUpdatesListener = ipcRenderer.on('main:bruno-config-update', (val) =>
      dispatch(brunoConfigUpdateEvent(val))
    );

    const removeShowPreferencesListener = ipcRenderer.on('main:open-preferences', () => {
      const state = store.getState();
      const activeWorkspaceUid = state.workspaces?.activeWorkspaceUid;
      const workspaces = state.workspaces?.workspaces;
      const tabs = state.tabs?.tabs;
      const activeTabUid = state.tabs?.activeTabUid;
      const activeTab = tabs?.find((t) => t.uid === activeTabUid);

      const activeWorkspace = workspaces?.find((w) => w.uid === activeWorkspaceUid);
      const collectionUid = activeTab?.collectionUid || activeWorkspace?.scratchCollectionUid;

      dispatch(
        addTab({
          type: 'preferences',
          uid: collectionUid ? `${collectionUid}-preferences` : 'preferences',
          collectionUid
        })
      );
    });

    const removePreferencesUpdatesListener = ipcRenderer.on('main:load-preferences', (val) => {
      dispatch(updatePreferences(val));
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

    const removeCollectionOauth2CredentialsClearListener = ipcRenderer.on('main:credentials-clear', (val) => {
      dispatch(collectionClearOauth2CredentialsByCredentialsId(val));
    });

    const removeHttpStreamNewDataListener = ipcRenderer.on('main:http-stream-new-data', (val) => {
      dispatch(streamDataReceived(val));
    });

    const removeHttpStreamEndListener = ipcRenderer.on('main:http-stream-end', (val) => {
      dispatch(requestCancelled(val));
    });

    const removeCollectionLoadingStateListener = ipcRenderer.on('main:collection-loading-state-updated', (val) => {
      dispatch(updateCollectionLoadingState(val));
    });

    const gitVersionListener = ipcRenderer.on('main:git-version', (val) => {
      dispatch(setGitVersion(val));
    });

    return () => {
      removeCollectionTreeUpdateListener();
      removeCollectionTreeBatchUpdateListener();
      removeApiSpecTreeUpdateListener();
      removeOpenCollectionListener();
      removeOpenWorkspaceListener();
      removeWorkspaceConfigUpdatedListener();
      removeWorkspaceEnvironmentAddedListener();
      removeWorkspaceEnvironmentChangedListener();
      removeWorkspaceEnvironmentDeletedListener();
      removeDisplayErrorListener();
      removeScriptEnvUpdateListener();
      removeGlobalEnvironmentVariablesUpdateListener();
      removeCollectionRenamedListener();
      removeRunFolderEventListener();
      removeRunRequestEventListener();
      removeProcessEnvUpdatesListener();
      removeWorkspaceDotEnvUpdatesListener();
      removeDotEnvFileUpdateListener();
      removeConsoleLogListener();
      removeConfigUpdatesListener();
      removeShowPreferencesListener();
      removePreferencesUpdatesListener();
      removeCookieUpdateListener();
      removeGlobalEnvironmentsUpdatesListener();
      removeSnapshotHydrationListener();
      removeCollectionOauth2CredentialsUpdatesListener();
      removeCollectionOauth2CredentialsClearListener();
      removeHttpStreamNewDataListener();
      removeHttpStreamEndListener();
      removeCollectionLoadingStateListener();
      removePersistentEnvVariablesUpdateListener();
      removeSystemResourcesListener();
      gitVersionListener();
    };
  }, [isElectron]);
};

export default useIpcEvents;
