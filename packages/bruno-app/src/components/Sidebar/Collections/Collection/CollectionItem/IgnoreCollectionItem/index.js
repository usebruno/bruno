import React from 'react';
import Modal from 'components/Modal';
import { useSelector, useDispatch } from 'react-redux';
import { ignoreFolder, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { recursivelyGetAllItemUids } from 'utils/collections';
import toast from 'react-hot-toast';

const IgnoreCollectionItem = ({ onClose, item, collectionUid }) => {
  const dispatch = useDispatch();
  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
  const isYamlCollection = collection?.format === 'yml' || Boolean(collection?.brunoConfig?.opencollection);
  const configFileName = isYamlCollection ? 'opencollection.yml' : 'bruno.json';

  const onConfirm = () => {
    dispatch(ignoreFolder(item.uid, collectionUid))
      .then(() => {
        const tabUids = [...recursivelyGetAllItemUids(item.items), item.uid];
        dispatch(closeTabs({ tabUids }));
        toast.success('Folder ignored');
      })
      .catch((error) => {
        console.error('Error ignoring folder', error);
        toast.error(error?.message || 'Error ignoring folder');
      });
    onClose();
  };

  return (
    <Modal
      size="md"
      title="Ignore Folder"
      confirmText="Ignore"
      handleConfirm={onConfirm}
      handleCancel={onClose}
    >
      Ignoring <span className="font-medium">{item.name}</span> will hide it from this
      {' '}
      {isYamlCollection ? 'opencollection (YAML)' : 'Bruno (JSON)'}
      {' '}
      collection by adding it to the
      {' '}
      <span className="font-medium">ignore</span>
      {' '}
      list in
      {' '}
      <span className="font-medium">{configFileName}</span>
      . The folder and its files are not deleted, and you can unignore it later from the collection settings.
    </Modal>
  );
};

export default IgnoreCollectionItem;
