import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useSelector, useDispatch } from 'react-redux';
import { recursivelyGetAllItemUids } from 'utils/collections';
import { removeCollectionFromWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { removeLocalCollection } from 'providers/ReduxStore/slices/collections/actions';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';

const RemoveCollectionFromWorkspace = ({ onClose, collection }) => {
  const dispatch = useDispatch();
  const { activeWorkspaceUid } = useSelector((state) => state.workspaces);

  const onConfirm = () => {
    dispatch(removeCollectionFromWorkspace(activeWorkspaceUid, collection.uid))
      .then(() => {
        dispatch(
          closeTabs({
            tabUids: recursivelyGetAllItemUids(collection.items)
          })
        );
      })
      .then(() => dispatch(removeLocalCollection(collection.uid)))
      .then(() => toast.success('Collection removed from workspace'))
      .catch((err) => console.log(err) && toast.error('An error occured while removing the collection'));
  };

  return (
    <Modal size="sm" title="Remove Collection from Workspace" confirmText="Remove" handleConfirm={onConfirm} handleCancel={onClose}>
      Are you sure you want to remove the collection <span className="font-semibold">{collection.name}</span> from this workspace?
    </Modal>
  );
};

export default RemoveCollectionFromWorkspace;
