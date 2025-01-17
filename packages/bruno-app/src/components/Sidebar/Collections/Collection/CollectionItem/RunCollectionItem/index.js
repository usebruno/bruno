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

  const getRequestsCount = (items) => {
    const requestTypes = ['http-request', 'graphql-request']
    return items.filter(req => requestTypes.includes(req.type)).length;
  }

  const runLength = item ? getRequestsCount(item.items) : get(collection, 'items.length', 0);
  const flattenedItems = flattenItems(item ? item.items : collection.items);
  const recursiveRunLength = getRequestsCount(flattenedItems);

  return (
    <StyledWrapper>
      <Modal size="md" title="Collection Runner" hideFooter={true} handleCancel={onClose}>
        {!runLength && !recursiveRunLength ? (
          <div className="mb-8">No request found in this folder.</div>
        ) : (
          <div>
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
                <button type="submit" disabled={!recursiveRunLength} className="submit btn btn-md btn-secondary mr-3" onClick={() => onSubmit(true)}>
                  Recursive Run
                </button>
              </span>
              <span>
                <button type="submit" disabled={!runLength} className="submit btn btn-md btn-secondary" onClick={() => onSubmit(false)}>
                  Run
                </button>
              </span>
            </div>
          </div>
        )}
      </Modal>
    </StyledWrapper>
  );
};

export default RunCollectionItem;
