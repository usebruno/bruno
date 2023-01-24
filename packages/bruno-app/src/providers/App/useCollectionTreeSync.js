import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  collectionAddDirectoryEvent,
  collectionAddFileEvent,
  collectionChangeFileEvent,
  collectionUnlinkFileEvent,
  collectionUnlinkDirectoryEvent,
  collectionUnlinkEnvFileEvent
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

    ipcRenderer.invoke('renderer:ready');

    const removeListener1 = ipcRenderer.on('main:collection-opened', _openCollection);
    const removeListener2 = ipcRenderer.on('main:collection-tree-updated', _collectionTreeUpdated);
    const removeListener3 = ipcRenderer.on('main:collection-already-opened', _collectionAlreadyOpened);
    const removeListener4 = ipcRenderer.on('main:display-error', _displayError);

    return () => {
      removeListener1();
      removeListener2();
      removeListener3();
      removeListener4();
    };
  }, [isElectron]);
};

export default useCollectionTreeSync;
