import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import SaveRequestsModal from './SaveRequestsModal';
import { isElectron } from 'utils/common/platform';
import { persistTransientDraftsBeforeQuit } from 'providers/ReduxStore/slices/collections/actions';

const ConfirmAppClose = () => {
  const { ipcRenderer } = window;
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isElectron()) {
      return;
    }

    const clearListener = ipcRenderer.on('main:start-quit-flow', async () => {
      try {
        await dispatch(persistTransientDraftsBeforeQuit());
      } catch (err) {
        console.error('Failed to persist transient drafts before quit:', err);
      }
      setShowConfirmClose(true);
    });

    return () => {
      clearListener();
    };
  }, [isElectron, ipcRenderer, dispatch, setShowConfirmClose]);

  if (!showConfirmClose) {
    return null;
  }

  return <SaveRequestsModal onClose={() => setShowConfirmClose(false)} />;
};

export default ConfirmAppClose;
