import React, { useEffect, useState, useCallback } from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';

const FolderNotFound = ({ folderUid }) => {
  const dispatch = useDispatch();
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  const closeTab = useCallback(() => {
    dispatch(
      closeTabs({
        tabUids: [folderUid]
      })
    );
  }, [dispatch, folderUid]);

  useEffect(() => {
    setTimeout(() => {
      setShowErrorMessage(true);
    }, 300);
  }, []);

  if (!showErrorMessage) {
    return null;
  }

  return (
    <div className="mt-6 px-6">
      <div className="p-4 bg-orange-100 border-l-4 border-yellow-500 text-yellow-700">
        <div>Folder no longer exists.</div>
        <div className="mt-2">
          This can happen when the folder was renamed or deleted on your filesystem.
        </div>
      </div>
      <button className="btn btn-md btn-secondary mt-6" onClick={closeTab}>
        Close Tab
      </button>
    </div>
  );
};

export default FolderNotFound; 