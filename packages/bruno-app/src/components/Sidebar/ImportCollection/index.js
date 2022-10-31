import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { collectionImported } from 'providers/ReduxStore/slices/collections';
import importBrunoCollection from 'utils/importers/bruno-collection';
import importPostmanCollection from 'utils/importers/postman-collection';
import { addCollectionToWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { toastError } from 'utils/common/error';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';

const ImportCollection = ({ onClose }) => {
  const dispatch = useDispatch();
  const { activeWorkspaceUid } = useSelector((state) => state.workspaces);

  const handleImportBrunoCollection = () => {
    importBrunoCollection()
      .then((collection) => {
        dispatch(collectionImported({ collection: collection }));
        dispatch(addCollectionToWorkspace(activeWorkspaceUid, collection.uid));
        toast.success('Collection imported successfully');
        onClose();
      })
      .catch((err) => toastError(err, 'Import collection failed'));
  };

  const handleImportPostmanCollection = () => {
    importPostmanCollection()
      .then((collection) => {
        dispatch(collectionImported({ collection: collection }));
        dispatch(addCollectionToWorkspace(activeWorkspaceUid, collection.uid));
        toast.success('Postman Collection imported successfully');
        onClose();
      })
      .catch((err) => toastError(err, 'Postman Import collection failed'));
  };

  return (
    <Modal size="sm" title="Import Collection" hideFooter={true} handleConfirm={onClose} handleCancel={onClose}>
      <div>
        <div
          className='text-link hover:underline cursor-pointer'
          onClick={handleImportBrunoCollection}
        >
          Bruno Collection
        </div>
        <div
          className='text-link hover:underline cursor-pointer mt-2'
          onClick={handleImportPostmanCollection}
        >
          Postman Collection
        </div>
      </div>
    </Modal>
  );
};

export default ImportCollection;
