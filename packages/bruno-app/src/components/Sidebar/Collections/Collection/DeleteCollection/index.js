import React from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import TypeToConfirmDeleteModal from 'components/TypeToConfirmDeleteModal';
import { removeCollectionFromWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { findCollectionByUid } from 'utils/collections/index';

const DeleteCollection = ({ onClose, collectionUid, workspaceUid }) => {
  const dispatch = useDispatch();
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const workspace = useSelector((state) => state.workspaces.workspaces.find((w) => w.uid === workspaceUid));

  const onConfirm = async () => {
    if (!collection || !workspace) {
      toast.error('Collection or workspace not found');
      onClose();
      return;
    }

    try {
      await dispatch(removeCollectionFromWorkspaceAction(workspace.uid, collection.pathname, { deleteFiles: true }));
      toast.success(`Deleted "${collection.name}" collection`);
      onClose();
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error(error.message || 'An error occurred while deleting the collection');
    }
  };

  if (!collection) {
    return null;
  }

  return (
    <TypeToConfirmDeleteModal
      title="Delete Collection"
      name={collection.name}
      pathname={collection.pathname}
      warning="This action cannot be undone. The collection files will be permanently deleted from disk."
      onConfirm={onConfirm}
      onClose={onClose}
      dataTestId="delete-collection-modal"
    />
  );
};

export default DeleteCollection;
