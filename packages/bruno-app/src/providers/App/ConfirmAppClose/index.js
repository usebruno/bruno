import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import SaveRequestsModal from './SaveRequestsModal';
import { isElectron } from 'utils/common/platform';
import { completeQuitFlow } from 'providers/ReduxStore/slices/app';

const ConfirmAppClose = () => {
  const { ipcRenderer } = window;
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const dispatch = useDispatch();

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

  if (!showConfirmClose) {
    return null;
  }

  return <SaveRequestsModal onConfirm={completeQuitFlow} onClose={() => setShowConfirmClose(false)} />;
};

export default ConfirmAppClose;
