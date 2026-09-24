import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { isEqual } from 'lodash';
import { IconServer2 } from '@tabler/icons';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { mockResponseFromEditorItem } from 'utils/mock-server/mock-responses/editor';
import GradientCloseButton from '../../../RequestTabs/RequestTab/GradientCloseButton';
import StyledWrapper from '../../../RequestTabs/RequestTab/StyledWrapper';

const MockResponseTab = ({ tab }) => {
  const dispatch = useDispatch();
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

  const handleCloseClick = (event) => {
    event.stopPropagation();
    if (hasUnsavedChanges() && !window.confirm('This mock response has unsaved changes. Close without saving?')) {
      return;
    }
    dispatch(closeTabs({ tabUids: [tab.uid] }));
  };

  return (
    <StyledWrapper className="flex items-center justify-between tab-container px-2">
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
