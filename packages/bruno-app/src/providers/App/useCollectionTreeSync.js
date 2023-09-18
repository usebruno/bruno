import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  collectionAddDirectoryEvent,
  collectionAddFileEvent,
  collectionChangeFileEvent,
  collectionUnlinkFileEvent,
  collectionUnlinkDirectoryEvent,
  collectionUnlinkEnvFileEvent,
  scriptEnvironmentUpdateEvent,
  collectionRenamedEvent,
  runRequestEvent,
  runFolderEvent
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

    const _collectionAlreadyOpened = (pathname) => {
      toast.success('Collection is already opened');
    };

    const _displayError = (error) => {
      if (typeof error === 'string') {
        return toast.error(error || 'Something went wrong!');
      }
      if (typeof message === 'object') {
        return toast.error(error.message || 'Something went wrong!');
      }
    };

    const _scriptEnvironmentUpdate = (val) => {
      dispatch(scriptEnvironmentUpdateEvent(val));
    };

    const _collectionRenamed = (val) => {
      dispatch(collectionRenamedEvent(val));
    };

    const _runFolderEvent = (val) => {
      dispatch(runFolderEvent(val));
    };

    const _runRequestEvent = (val) => {
      dispatch(runRequestEvent(val));
    };

    ipcRenderer.invoke('renderer:ready');

    const removeListener1 = ipcRenderer.on('main:collection-opened', _openCollection);
    const removeListener2 = ipcRenderer.on('main:collection-tree-updated', _collectionTreeUpdated);
    const removeListener3 = ipcRenderer.on('main:collection-already-opened', _collectionAlreadyOpened);
    const removeListener4 = ipcRenderer.on('main:display-error', _displayError);
    const removeListener5 = ipcRenderer.on('main:script-environment-update', _scriptEnvironmentUpdate);
    const removeListener6 = ipcRenderer.on('main:collection-renamed', _collectionRenamed);
    const removeListener7 = ipcRenderer.on('main:run-folder-event', _runFolderEvent);
    const removeListener8 = ipcRenderer.on('main:run-request-event', _runRequestEvent);
    const removeListener9 = ipcRenderer.on('main:console-log', (val) => {
      console[val.type](...val.args);
    });

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
