import React, { useMemo } from 'react';
import get from 'lodash/get';
import { IconX, IconHome, IconWorld, IconSettings } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { closeWorkspaceTab } from 'providers/ReduxStore/slices/workspaceTabs';
import StyledWrapper from './StyledWrapper';

const TAB_ICONS = {
  overview: IconHome,
  environments: IconWorld,
  preferences: IconSettings
};

const WorkspaceTab = ({ tab, item, isActive }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();

  const handleCloseClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    dispatch(closeWorkspaceTab({ uid: tab.uid }));
  };

  // Get method for scratch-request tabs
  const method = useMemo(() => {
    if (tab.type !== 'scratch-request' || !item) return null;
    switch (item.type) {
      case 'grpc-request':
        return 'gRPC';
      case 'ws-request':
        return 'WS';
      case 'graphql-request':
        return 'GQL';
      default:
        return item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');
    }
  }, [tab.type, item]);

  const getMethodColor = (method = '') => {
    const colorMap = {
      ...theme.request.methods,
      ...theme.request
    };
    return colorMap[method.toLocaleLowerCase()];
  };

  const TabIcon = TAB_ICONS[tab.type];

  // Render scratch-request tab with method
  if (tab.type === 'scratch-request') {
    return (
      <StyledWrapper className="flex items-center justify-between tab-container px-2">
        <div className="flex items-center tab-label">
          {method && (
            <span className="tab-method mr-1" style={{ color: getMethodColor(method) }}>
              {method}
            </span>
          )}
          <span className="tab-name" title={tab.label}>
            {tab.label}
          </span>
        </div>
        <div className="close-icon" onClick={handleCloseClick}>
          <IconX size={14} strokeWidth={1.5} />
        </div>
      </StyledWrapper>
    );
  }

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
