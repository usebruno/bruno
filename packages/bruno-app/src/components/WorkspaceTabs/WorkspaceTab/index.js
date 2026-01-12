import React from 'react';
import { IconX, IconHome, IconWorld, IconSettings } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { closeWorkspaceTab } from 'providers/ReduxStore/slices/workspaceTabs';
import StyledWrapper from './StyledWrapper';

const TAB_ICONS = {
  overview: IconHome,
  environments: IconWorld,
  preferences: IconSettings
};

const WorkspaceTab = ({ tab, isActive }) => {
  const dispatch = useDispatch();

  const handleCloseClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    dispatch(closeWorkspaceTab({ uid: tab.uid }));
  };

  const TabIcon = TAB_ICONS[tab.type];

  return (
    <StyledWrapper className={`flex items-center justify-between tab-container px-2 ${tab.permanent ? 'permanent' : ''}`}>
      <div className="flex items-center tab-label">
        {TabIcon && (
          <span className="tab-icon">
            <TabIcon size={14} strokeWidth={1.5} />
          </span>
        )}
        <span className="tab-name" title={tab.label}>
          {tab.label}
        </span>
      </div>
      {!tab.permanent && (
        <div className="close-icon" onClick={handleCloseClick}>
          <IconX size={14} strokeWidth={1.5} />
        </div>
      )}
    </StyledWrapper>
  );
};

export default WorkspaceTab;
