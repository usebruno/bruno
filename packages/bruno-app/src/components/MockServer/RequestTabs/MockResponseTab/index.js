import React from 'react';
import { useDispatch } from 'react-redux';
import { IconServer2 } from '@tabler/icons';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import GradientCloseButton from '../../../RequestTabs/RequestTab/GradientCloseButton';
import StyledWrapper from '../../../RequestTabs/RequestTab/StyledWrapper';

const MockResponseTab = ({ tab }) => {
  const dispatch = useDispatch();
  const tabLabel = tab.responseName || tab.tabName || 'Mock Response';

  const handleCloseClick = (event) => {
    event.stopPropagation();
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
