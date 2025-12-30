import React, { useEffect, useState, useCallback } from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import ErrorBanner from 'ui/ErrorBanner';
import Button from 'ui/Button';

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

  const errors = [
    {
      title: 'Folder no longer exists',
      message: 'This can happen when the folder was renamed or deleted on your filesystem.'
    }
  ];

  return (
    <div className="mt-6 px-6">
      <ErrorBanner errors={errors} className="mb-4" />
      <Button size="md" color="secondary" variant="ghost" onClick={closeTab}>
        Close Tab
      </Button>
    </div>
  );
};

export default FolderNotFound;
