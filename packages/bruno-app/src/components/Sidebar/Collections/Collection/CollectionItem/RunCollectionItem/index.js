import React from 'react';
import get from 'lodash/get';
import { uuid } from 'utils/common';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { runCollectionFolder } from 'providers/ReduxStore/slices/collections/actions';
import { flattenItems } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const RunCollectionItem = ({ collection, item, onClose }) => {
  const dispatch = useDispatch();

  const onSubmit = (recursive) => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
    dispatch(runCollectionFolder(collection.uid, item ? item.uid : null, recursive));
    onClose();
  };

  const runLength = item ? get(item, 'items.length', 0) : get(collection, 'items.length', 0);
  const items = flattenItems(item ? item.items : collection.items);
  const requestItems = items.filter((item) => item.type !== 'folder');
  const recursiveRunLength = requestItems.length;

  return (
    <StyledWrapper>
      <Modal size="md" title="Collection Index" hideFooter={true} handleCancel={onClose}>
        <div className="mb-1">
          <span className="font-medium">Run</span>
          <span className="ml-1 text-xs">({runLength} requests)</span>
        </div>
        <div className="mb-8">This will only run the requests in this folder.</div>

        <div className="mb-1">
          <span className="font-medium">Recursive Run</span>
          <span className="ml-1 text-xs">({recursiveRunLength} requests)</span>
        </div>
        <div className="mb-8">This will run all the requests in this folder and all its subfolders.</div>

        <div className="flex justify-end bruno-modal-footer">
          <span className="mr-3">
            <button type="button" onClick={onClose} className="btn btn-md btn-close">
              Cancel
            </button>
          </span>
          <span>
            <button type="submit" className="submit btn btn-md btn-secondary mr-3" onClick={() => onSubmit(true)}>
              Recursive Run
            </button>
          </span>
          <span>
            <button type="submit" className="submit btn btn-md btn-secondary" onClick={() => onSubmit(false)}>
              Run
            </button>
          </span>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default RunCollectionItem;
