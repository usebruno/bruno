import React from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { IconFiles } from '@tabler/icons';
import Modal from 'components/Modal';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid } from 'utils/collections/index';

const RemoveCollections = ({ collectionUids, onClose }) => {
  const dispatch = useDispatch();
  const allCollections = useSelector(state => state.collections.collections || []);

  const selectedCollections = collectionUids
    .map(uid => findCollectionByUid(allCollections, uid))
    .filter(Boolean);

  const collectionsNames = selectedCollections.map(c => c.name).join(', ');
  const collectionsPathnames = selectedCollections.map(c => c.pathname).join(', ');

  const onConfirm = () => {
    const removalPromises = selectedCollections.map(collection => {
      return dispatch(removeCollection(collection.uid));
    });

    Promise.all(removalPromises)
      .then(() => {
        toast.success('Collections are closed');
      })
      .catch(() => {
        toast.error('An error occurred while closing collections');
      })
      .finally(() => {
        if (onClose) onClose();
      });
  };

  const getConfirmationText = () => {
    if (collectionUids.length > 1) {
      return `Are you sure you want to close all ${collectionUids.length} collections in Bruno?`;
    }
    return (
      <span>
        Are you sure you want to close the collection
        {' '}
        <span className="font-semibold">{collectionsNames}</span>
        {' '}
        in Bruno?
      </span>
    );
  };

  return (
    <Modal size="sm" title="Close Collections" confirmText="Close" handleConfirm={onConfirm} handleCancel={onClose}>
      <div className="flex items-center">
        <IconFiles size={18} strokeWidth={1.5} />
        <span className="ml-2 mr-4 font-semibold">{collectionsNames}</span>
      </div>
      <div className="break-words text-xs mt-1">{collectionsPathnames}</div>
      <div className="mt-4">{getConfirmationText()}</div>
      <div className="mt-4">
        It will still be available in the file system at the above locations and can be re-opened later.
      </div>
    </Modal>
  );
};

RemoveCollections.propTypes = {
  collectionUids: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func,
};

export default RemoveCollections;
