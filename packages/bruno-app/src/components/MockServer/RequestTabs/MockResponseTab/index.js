import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconServer2 } from '@tabler/icons';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { saveMockResponseEditor } from 'providers/ReduxStore/slices/mock-server/actions';
import { hasUnsavedMockResponseChanges } from 'utils/mock-server/mock-responses/editor';
import ConfirmRequestClose from 'components/RequestTabs/RequestTab/ConfirmRequestClose';
import GradientCloseButton from '../../../RequestTabs/RequestTab/GradientCloseButton';
import StyledWrapper from '../../../RequestTabs/RequestTab/StyledWrapper';

const MockResponseTab = ({ tab }) => {
  const dispatch = useDispatch();
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const tabLabel = tab.responseName || tab.tabName || 'Mock Response';
  const editor = useSelector((state) => state.collections.mockResponseEditors[tab.uid]);
  const hasChanges = hasUnsavedMockResponseChanges(editor, tab.uid);

  const closeTab = () => dispatch(closeTabs({ tabUids: [tab.uid] }));

  const handleCloseClick = (event) => {
    event.stopPropagation();
    if (hasChanges) {
      setShowConfirmClose(true);
      return;
    }
    closeTab();
  };

  const handleSaveAndClose = async () => {
    try {
      await dispatch(saveMockResponseEditor(tab.uid));
      setShowConfirmClose(false);
      closeTab();
    } catch (err) {
      toast.error(err.message || 'Failed to save mock response');
    }
  };

  return (
    <StyledWrapper className="flex items-center justify-between tab-container px-2">
      {showConfirmClose ? (
        <ConfirmRequestClose
          name={tabLabel}
          type="mock response"
          onCancel={() => setShowConfirmClose(false)}
          onCloseWithoutSave={() => {
            setShowConfirmClose(false);
            closeTab();
          }}
          onSaveAndClose={handleSaveAndClose}
        />
      ) : null}
      <div
        className="flex items-center tab-label"
        onDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))}
      >
        <IconServer2 size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
        <span className="tab-name ml-1 truncate" title={tabLabel}>{tabLabel}</span>
      </div>
      <GradientCloseButton onClick={handleCloseClick} hasChanges={hasChanges} />
    </StyledWrapper>
  );
};

export default MockResponseTab;
