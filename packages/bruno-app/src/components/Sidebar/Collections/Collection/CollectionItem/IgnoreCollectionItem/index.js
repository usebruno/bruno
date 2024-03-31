import React from 'react';
import Modal from 'components/Modal';
import { isItemAFolder } from 'utils/tabs';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import cloneDeep from 'lodash/cloneDeep';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';

const IgnoreCollectionItem = ({ onClose, item, collection }) => {
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);

  const onConfirm = () => {
    const brunoConfig = cloneDeep(collection.brunoConfig);
    const itemPath = resolveItemName(collection.pathname, item.pathname);

    if (brunoConfig.ignore.includes(itemPath)) {
      onClose();
    }

    brunoConfig.ignore.push(itemPath);

    dispatch(updateBrunoConfig(brunoConfig, collection.uid))
      .then(() => {
        toast.success(`${item.name} added to ignored list successfully`);
      })
      .catch((err) => console.log(err) && toast.error('Failed to update collection settings'));

    onClose();
  };

  const resolveItemName = (collectionPath, itemPath) => {
    const path = itemPath.replace(collectionPath, '');
    return path.substring(1);
  };

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title={`Ignore ${isFolder ? 'Folder' : 'Request'}`}
        confirmText="Ignore"
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        Are you sure you want to ignore <span className="font-semibold">{item.name}</span> ?
      </Modal>
    </StyledWrapper>
  );
};

export default IgnoreCollectionItem;
