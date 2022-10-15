import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  localCollectionAddDirectoryEvent,
  localCollectionAddFileEvent,
  localCollectionChangeFileEvent,
  localCollectionUnlinkFileEvent,
  localCollectionUnlinkDirectoryEvent
} from 'providers/ReduxStore/slices/collections';
import toast from 'react-hot-toast';
import { openLocalCollectionEvent } from 'providers/ReduxStore/slices/collections/actions'; 
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

    const _collectionAlreadyOpened = (pathname) => {
      toast.success('Collection is already opened under local collections');
    };

    const removeListener1 = ipcRenderer.on('main:collection-opened', _openCollection);
    const removeListener2 = ipcRenderer.on('main:collection-tree-updated', _collectionTreeUpdated);
    const removeListener3 = ipcRenderer.on('main:collection-already-opened', _collectionAlreadyOpened);

    return () => {
      removeListener1();
      removeListener2();
      removeListener3();
    };
  }, [isElectron]);
};

export default useLocalCollectionTreeSync;