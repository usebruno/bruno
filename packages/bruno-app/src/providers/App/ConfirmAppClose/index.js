import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SaveRequestsModal from './SaveRequestsModal';
import { isElectron } from 'utils/common/platform';
import { clearCloseAllConfirmation } from 'providers/ReduxStore/slices/tabs';

const ConfirmAppClose = () => {
  const { ipcRenderer } = window;
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const dispatch = useDispatch();

  // Also listen for Redux state for close all tabs
  const showCloseAllConfirmation = useSelector((state) => state.tabs.showCloseAllConfirmation);

  useEffect(() => {
    if (!isElectron()) {
      return;
    }

    const clearListener = ipcRenderer.on('main:start-quit-flow', () => {
      setShowConfirmClose(true);
    });

    return () => {
      clearListener();
    };
  }, [isElectron, ipcRenderer, dispatch, setShowConfirmClose]);

  // Check if we should show modal (either from IPC or Redux)
  const shouldShowModal = showConfirmClose || showCloseAllConfirmation;

  const handleClose = () => {
    setShowConfirmClose(false);
    if (showCloseAllConfirmation) {
      dispatch(clearCloseAllConfirmation());
    }
  };

  if (!shouldShowModal) {
    return null;
  }

  return (
    <SaveRequestsModal
      // If triggered via Redux (showCloseAllConfirmation), it's for closeAllTabs
      // If triggered via IPC (showConfirmClose), it's for app quit
      forCloseTabs={showCloseAllConfirmation}
      onClose={handleClose}
    />
  );
};

export default ConfirmAppClose;
