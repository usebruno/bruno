import { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { closeDisabledMockServerTabs, saveMockResponseEditor } from 'providers/ReduxStore/slices/mock-server/actions';
import { getUnsavedMockResponses } from 'utils/mock-server/mock-responses/editor';
import { pluralizeWord } from 'utils/common';

const useMockServerBetaToggle = (setMockServerEnabled) => {
  const dispatch = useDispatch();
  const mockResponseEditors = useSelector((state) => state.collections.mockResponseEditors);
  const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);
  const confirmationRef = useRef(0);
  const unsavedMockResponses = useMemo(() => getUnsavedMockResponses(mockResponseEditors), [mockResponseEditors]);

  const closeConfirmation = () => {
    confirmationRef.current += 1;
    setIsConfirmingDisable(false);
  };

  const disable = () => {
    closeConfirmation();
    setMockServerEnabled(false);
  };

  const saveAndDisable = async () => {
    const confirmation = confirmationRef.current;
    try {
      await Promise.all(unsavedMockResponses.map((response) => dispatch(saveMockResponseEditor(response.uid))));
      if (confirmation === confirmationRef.current) {
        disable();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save mock response');
    }
  };

  const toggle = (enabled) => {
    if (!enabled && unsavedMockResponses.length) {
      setIsConfirmingDisable(true);
      return;
    }
    setMockServerEnabled(enabled);
  };

  const handleSaved = useCallback((wasEnabled, isEnabled) => {
    if (wasEnabled && !isEnabled) {
      dispatch(closeDisabledMockServerTabs());
    }
  }, [dispatch]);

  const confirmDisableProps = isConfirmingDisable
    ? {
        name: unsavedMockResponses.map((response) => response.name).join(', '),
        type: pluralizeWord('mock response', unsavedMockResponses.length),
        onCancel: closeConfirmation,
        onCloseWithoutSave: disable,
        onSaveAndClose: saveAndDisable
      }
    : null;

  return { toggle, handleSaved, confirmDisableProps };
};

export default useMockServerBetaToggle;
