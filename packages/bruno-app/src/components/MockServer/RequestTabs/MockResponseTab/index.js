import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { isEqual } from 'lodash';
import { IconServer2 } from '@tabler/icons';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { mockResponseFromEditorItem } from 'utils/mock-server/mock-responses/editor';
import MockConfirmModal from 'components/MockServer/MockConfirmModal';
import GradientCloseButton from '../../../RequestTabs/RequestTab/GradientCloseButton';
import StyledWrapper from '../../../RequestTabs/RequestTab/StyledWrapper';

const MockResponseTab = ({ tab }) => {
  const dispatch = useDispatch();
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const tabLabel = tab.responseName || tab.tabName || 'Mock Response';
  const editor = useSelector((state) => state.collections.mockResponseEditors[tab.uid]);

  const hasUnsavedChanges = () => {
    if (!editor) return false;
    try {
      const draft = mockResponseFromEditorItem(editor.item, tab.uid, editor.rules, editor.savedMockResponse);
      return !isEqual(draft, editor.savedMockResponse);
    } catch {
      return true;
    }
  };

  const closeTab = () => dispatch(closeTabs({ tabUids: [tab.uid] }));

  const handleCloseClick = (event) => {
    event.stopPropagation();
    if (hasUnsavedChanges()) {
      setShowConfirmClose(true);
      return;
    }
    closeTab();
  };

  return (
    <StyledWrapper className="flex items-center justify-between tab-container px-2">
      {showConfirmClose ? (
        <MockConfirmModal
          title="Unsaved changes"
          confirmText="Close"
          confirmButtonColor="danger"
          dataTestId="confirm-mock-response-close-modal"
          onClick={(e) => e.stopPropagation()}
          onClose={() => setShowConfirmClose(false)}
          onConfirm={() => {
            setShowConfirmClose(false);
            closeTab();
          }}
        >
          This mock response has unsaved changes. Close without saving?
        </MockConfirmModal>
      ) : null}
      <div
        className="flex items-center tab-label"
        onDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))}
      >
        <IconServer2 size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
        <span className="tab-name ml-1 truncate" title={tabLabel}>{tabLabel}</span>
      </div>
      <GradientCloseButton onClick={handleCloseClick} />
    </StyledWrapper>
  );
};

export default MockResponseTab;
