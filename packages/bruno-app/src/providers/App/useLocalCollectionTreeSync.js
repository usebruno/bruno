import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  removeCollectionEvent,
  localCollectionAddDirectoryEvent,
  localCollectionAddFileEvent,
  localCollectionChangeFileEvent,
  localCollectionUnlinkFileEvent,
  localCollectionUnlinkDirectoryEvent
} from 'providers/ReduxStore/slices/collections';
import {
  openLocalCollectionEvent
} from 'providers/ReduxStore/slices/collections/actions'; 
import { isElectron } from 'utils/common/platform';

const useLocalCollectionTreeSync = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    if(!isElectron()) {
      return () => {};
    }

    const { ipcRenderer } = window;

    const _openCollection = (pathname, uid) => {
      console.log(`collection uid: ${uid}, pathname: ${pathname}`);
      dispatch(openLocalCollectionEvent(uid, pathname));
    };

    const _collectionTreeUpdated = (type, val) => {
      if(type === 'addDir') {
        dispatch(localCollectionAddDirectoryEvent({
          dir: val
        }));
      }
      if(type === 'addFile') {
        dispatch(localCollectionAddFileEvent({
          file: val
        }));
      }
      if(type === 'change') {
        dispatch(localCollectionChangeFileEvent({
          file: val
        }));
      }
      if(type === 'unlink') {
        setTimeout(() => {
          dispatch(localCollectionUnlinkFileEvent({
            file: val
          }));
        }, 100);
      }
      if(type === 'unlinkDir') {
        dispatch(localCollectionUnlinkDirectoryEvent({
          directory: val
        }));
      }
    };

    const _collectionRemoved = (pathname) => {
      // dispatch(removeCollectionEvent({
      //   pathname
      // }));
    };

    const removeListener1 = ipcRenderer.on('main:collection-opened', _openCollection);
    const removeListener2 = ipcRenderer.on('main:collection-tree-updated', _collectionTreeUpdated);
    const removeListener3 = ipcRenderer.on('main:collection-removed', _collectionRemoved);

    return () => {
      removeListener1();
      removeListener2();
      removeListener3();
    };
  }, [isElectron]);
};

export default useLocalCollectionTreeSync;