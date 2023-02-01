import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  collectionAddDirectoryEvent,
  collectionAddFileEvent,
  collectionChangeFileEvent,
  collectionUnlinkFileEvent,
  collectionUnlinkDirectoryEvent,
  collectionUnlinkEnvFileEvent,
  requestSentEvent,
  requestQueuedEvent,
  testResultsEvent,
  scriptEnvironmentUpdateEvent,
  collectionRenamedEvent
} from 'providers/ReduxStore/slices/collections';
import toast from 'react-hot-toast';
import { openCollectionEvent, collectionAddEnvFileEvent } from 'providers/ReduxStore/slices/collections/actions';
import { isElectron } from 'utils/common/platform';

const useCollectionTreeSync = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    const { ipcRenderer } = window;

    const _openCollection = (pathname, uid, name) => {
      dispatch(openCollectionEvent(uid, pathname, name));
    };

    const _collectionTreeUpdated = (type, val) => {
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

    const _collectionAlreadyOpened = (pathname) => {
      toast.success('Collection is already opened');
    };

    const _displayError = (message) => {
      toast.error(message || 'Something went wrong!');
    };

    const _httpRequestSent = (val) => {
      dispatch(requestSentEvent(val));
    };

    const _scriptEnvironmentUpdate = (val) => {
      dispatch(scriptEnvironmentUpdateEvent(val));
    };

    const _httpRequestQueued = (val) => {
      dispatch(requestQueuedEvent(val));
    };

    const _testResults = (val) => {
      dispatch(testResultsEvent(val));
    };

    const _collectionRenamed = (val) => {
      dispatch(collectionRenamedEvent(val));
    };

    ipcRenderer.invoke('renderer:ready');

    const removeListener1 = ipcRenderer.on('main:collection-opened', _openCollection);
    const removeListener2 = ipcRenderer.on('main:collection-tree-updated', _collectionTreeUpdated);
    const removeListener3 = ipcRenderer.on('main:collection-already-opened', _collectionAlreadyOpened);
    const removeListener4 = ipcRenderer.on('main:display-error', _displayError);
    const removeListener5 = ipcRenderer.on('main:http-request-sent', _httpRequestSent);
    const removeListener6 = ipcRenderer.on('main:script-environment-update', _scriptEnvironmentUpdate);
    const removeListener7 = ipcRenderer.on('main:http-request-queued', _httpRequestQueued);
    const removeListener8 = ipcRenderer.on('main:test-results', _testResults);
    const removeListener9 = ipcRenderer.on('main:collection-renamed', _collectionRenamed);

    return () => {
      removeListener1();
      removeListener2();
      removeListener3();
      removeListener4();
      removeListener5();
      removeListener6();
      removeListener7();
      removeListener8();
      removeListener9();
    };
  }, [isElectron]);
};

export default useCollectionTreeSync;
