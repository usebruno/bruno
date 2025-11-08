import React, { useEffect, useMemo } from 'react';
import each from 'lodash/each';
import filter from 'lodash/filter';
import groupBy from 'lodash/groupBy';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { findCollectionByUid, flattenItems, isItemARequest, hasRequestChanges } from 'utils/collections';
import { pluralizeWord } from 'utils/common';
import { completeQuitFlow } from 'providers/ReduxStore/slices/app';
import { saveMultipleRequests } from 'providers/ReduxStore/slices/collections/actions';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';

const SaveRequestsModal = ({ onClose }) => {
  const MAX_UNSAVED_REQUESTS_TO_SHOW = 5;
  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);
  const dispatch = useDispatch();

  const currentDrafts = useMemo(() => {
    const drafts = [];
    const tabsByCollection = groupBy(tabs, (t) => t.collectionUid);

    Object.keys(tabsByCollection).forEach((collectionUid) => {
      const collection = findCollectionByUid(collections, collectionUid);
      if (collection) {
        const items = flattenItems(collection.items);
        const collectionDrafts = filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
        each(collectionDrafts, (draft) => {
          drafts.push({
            ...draft,
            collectionUid: collectionUid
          });
        });
      }
    });

    return drafts;
  }, [collections, tabs]);

  useEffect(() => {
    if (currentDrafts.length === 0) {
      return dispatch(completeQuitFlow());
    }
  }, [currentDrafts, dispatch]);

  const closeWithoutSave = () => {
    dispatch(completeQuitFlow());
    onClose();
  };

  const closeWithSave = () => {
    dispatch(saveMultipleRequests(currentDrafts))
      .then(() => dispatch(completeQuitFlow()))
      .then(() => onClose());
  };

  if (!currentDrafts.length) {
    return null;
  }

  return (
    <Modal
      size="md"
      title="Unsaved changes"
      confirmText="Save and Close"
      cancelText="Close without saving"
      handleCancel={onClose}
      disableEscapeKey={true}
      disableCloseOnOutsideClick={true}
      closeModalFadeTimeout={150}
      hideFooter={true}
    >
      <div className="flex items-center">
        <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
        <h1 className="ml-2 text-lg font-semibold">Hold on..</h1>
      </div>
      <p className="mt-4">
        Do you want to save the changes you made to the following{' '}
        <span className="font-medium">{currentDrafts.length}</span> {pluralizeWord('request', currentDrafts.length)}?
      </p>

      <ul className="mt-4">
        {currentDrafts.slice(0, MAX_UNSAVED_REQUESTS_TO_SHOW).map((item) => {
          return (
            <li key={item.uid} className="mt-1 text-xs">
              {item.filename}
            </li>
          );
        })}
      </ul>

      {currentDrafts.length > MAX_UNSAVED_REQUESTS_TO_SHOW && (
        <p className="mt-1 text-xs">
          ...{currentDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW} additional{' '}
          {pluralizeWord('request', currentDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW)} not shown
        </p>
      )}

      <div className="flex justify-between mt-6">
        <div>
          <button className="btn btn-sm btn-danger" onClick={closeWithoutSave}>
            Don't Save
          </button>
        </div>
        <div>
          <button className="btn btn-close btn-sm mr-2" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={closeWithSave}>
            {currentDrafts.length > 1 ? 'Save All' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveRequestsModal;
