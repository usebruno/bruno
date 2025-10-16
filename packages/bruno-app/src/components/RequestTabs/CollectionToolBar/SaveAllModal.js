import React, { useState, useEffect } from 'react';
import each from 'lodash/each';
import filter from 'lodash/filter';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { findCollectionByUid, flattenItems, isItemARequest } from 'utils/collections';
import { pluralizeWord } from 'utils/common';
import { saveSelectedRequests } from 'providers/ReduxStore/slices/collections/actions';
import { IconDeviceFloppy, IconCheck } from '@tabler/icons';
import Modal from 'components/Modal';

const SaveAllModal = ({ collection, onClose }) => {
  const dispatch = useDispatch();
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [currentDrafts, setCurrentDrafts] = useState([]);

  // Find all drafts in the current collection
  useEffect(() => {
    if (collection) {
      const items = flattenItems(collection.items);
      const drafts = filter(items, (item) => isItemARequest(item) && item.draft);
      const draftsWithCollectionUid = drafts.map((draft) => ({
        ...draft,
        collectionUid: collection.uid
      }));
      setCurrentDrafts(draftsWithCollectionUid);
      // Select all by default
      setSelectedRequests(new Set(draftsWithCollectionUid.map((draft) => draft.uid)));
    }
  }, [collection]);

  const handleToggleRequest = (requestUid) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestUid)) {
      newSelected.delete(requestUid);
    } else {
      newSelected.add(requestUid);
    }
    setSelectedRequests(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedRequests(new Set(currentDrafts.map((draft) => draft.uid)));
  };

  const handleDeselectAll = () => {
    setSelectedRequests(new Set());
  };

  const handleSaveSelected = () => {
    const requestsToSave = currentDrafts.filter((draft) => selectedRequests.has(draft.uid));

    if (requestsToSave.length === 0) {
      return;
    }

    dispatch(saveSelectedRequests(requestsToSave))
      .then(() => onClose())
      .catch((err) => {
        console.error('Error saving requests:', err);
        // Error toast is already handled in the action
      });
  };

  if (!currentDrafts.length) {
    return null;
  }

  const selectedCount = selectedRequests.size;
  const allSelected = selectedCount === currentDrafts.length;
  const someSelected = selectedCount > 0 && selectedCount < currentDrafts.length;

  return (
    <Modal
      size="lg"
      title="Save Requests"
      closeModalFadeTimeout={150}
      hideFooter={true}
    >
      <div className="flex items-center mb-4">
        <IconDeviceFloppy size={32} strokeWidth={1.5} className="text-blue-500" />
        <h1 className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Select requests to save ({selectedCount} of {currentDrafts.length} selected)
        </h1>
      </div>

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        The following {currentDrafts.length} {pluralizeWord('request', currentDrafts.length)} have unsaved changes:
      </p>

      {/* Select All / Deselect All buttons */}
      <div className="flex gap-2 mb-4">
        <button
          className="btn btn-sm btn-outline"
          onClick={allSelected ? handleDeselectAll : handleSelectAll}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
        {someSelected && (
          <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
            {selectedCount} selected
          </span>
        )}
      </div>

      {/* Request list with checkboxes */}
      <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        {currentDrafts.map((item) => {
          const isSelected = selectedRequests.has(item.uid);
          return (
            <div
              key={item.uid}
              className={`flex items-center p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => handleToggleRequest(item.uid)}
            >
              <div className="flex items-center justify-center w-5 h-5 mr-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800">
                {isSelected && <IconCheck size={16} className="text-blue-600 dark:text-blue-400" />}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.filename}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{item.name}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 mt-6">
        <button className="btn btn-close btn-sm" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleSaveSelected}
          disabled={selectedCount === 0}
        >
          Save Selected ({selectedCount})
        </button>
      </div>
    </Modal>
  );
};

export default SaveAllModal;
