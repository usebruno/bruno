import React from 'react';
import { IconCheck, IconChevronDown, IconFolder, IconHome, IconPin, IconPinned, IconPlus } from '@tabler/icons';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { savePreferences, showHomePage, toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import { closeConsole, openConsole } from 'providers/ReduxStore/slices/logs';
import { openWorkspaceDialog, switchWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { sortWorkspaces, toggleWorkspacePin } from 'utils/workspaces';

import Bruno from 'components/Bruno';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import IconSidebarToggle from 'components/Icons/IconSidebarToggle';
import CreateWorkspace from 'components/WorkspaceSidebar/CreateWorkspace';

import IconBottombarToggle from 'components/Icons/IconBottombarToggle/index';
import StyledWrapper from './StyledWrapper';
import { toTitleCase } from 'utils/common/index';
import ResponseLayoutToggle from 'components/ResponsePane/ResponseLayoutToggle';

const AppTitleBar = () => {
  const dispatch = useDispatch();
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Listen for fullscreen changes
  useEffect(() => {
    const { ipcRenderer } = window;
    if (!ipcRenderer) return;

    const removeEnterFullScreenListener = ipcRenderer.on('main:enter-full-screen', () => {
      setIsFullScreen(true);
    });

    const removeLeaveFullScreenListener = ipcRenderer.on('main:leave-full-screen', () => {
      setIsFullScreen(false);
    });

    return () => {
      removeEnterFullScreenListener();
      removeLeaveFullScreenListener();
    };
  }, []);

  // Get workspace info
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const preferences = useSelector((state) => state.app.preferences);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const isConsoleOpen = useSelector((state) => state.logs.isConsoleOpen);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  // Sort workspaces according to preferences
  const sortedWorkspaces = useMemo(() => {
    return sortWorkspaces(workspaces, preferences);
  }, [workspaces, preferences]);

  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);

  const WorkspaceName = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="workspace-name-container" {...props}>
        <span className="workspace-name">{toTitleCase(activeWorkspace?.name) || 'Default Workspace'}</span>
        <IconChevronDown size={14} stroke={1.5} className="chevron-icon" />
      </div>
    );
  });

  const handleHomeClick = () => {
    dispatch(showHomePage());
  };

  const handleWorkspaceSwitch = (workspaceUid) => {
    dispatch(switchWorkspace(workspaceUid));
    toast.success(`Switched to ${workspaces.find((w) => w.uid === workspaceUid)?.name}`);
  };

  const handleOpenWorkspace = async () => {
    try {
      await dispatch(openWorkspaceDialog());
      toast.success('Workspace opened successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to open workspace');
    }
  };

  const handleCreateWorkspace = () => {
    setCreateWorkspaceModalOpen(true);
  };

  const handlePinWorkspace = useCallback((workspaceUid, e) => {
    e.preventDefault();
    e.stopPropagation();
    const newPreferences = toggleWorkspacePin(workspaceUid, preferences);
    dispatch(savePreferences(newPreferences));
  }, [dispatch, preferences]);

  const handleToggleSidebar = () => {
    dispatch(toggleSidebarCollapse());
  };

  const handleToggleDevtools = () => {
    if (isConsoleOpen) {
      dispatch(closeConsole());
    } else {
      dispatch(openConsole());
    }
  };

  // Build workspace menu items
  const workspaceMenuItems = useMemo(() => {
    const items = sortedWorkspaces.map((workspace) => {
      const isActive = workspace.uid === activeWorkspaceUid;
      const isPinned = preferences?.workspaces?.pinnedWorkspaceUids?.includes(workspace.uid);

      return {
        id: workspace.uid,
        label: toTitleCase(workspace.name),
        onClick: () => handleWorkspaceSwitch(workspace.uid),
        className: `workspace-item ${isActive ? 'active' : ''}`,
        rightSection: (
          <div className="workspace-actions">
            {workspace.type !== 'default' && (
              <ActionIcon
                className={`pin-btn ${isPinned ? 'pinned' : ''}`}
                onClick={(e) => handlePinWorkspace(workspace.uid, e)}
                label={isPinned ? 'Unpin workspace' : 'Pin workspace'}
                size="sm"
              >
                {isPinned ? (
                  <IconPinned size={14} stroke={1.5} />
                ) : (
                  <IconPin size={14} stroke={1.5} />
                )}
              </ActionIcon>
            )}
            {isActive && <IconCheck size={16} stroke={1.5} className="check-icon" />}
          </div>
        )
      };
    });

    // Add label and action items
    items.push(
      { type: 'label', label: 'Workspaces' },
      {
        id: 'create-workspace',
        leftSection: IconPlus,
        label: 'Create workspace',
        onClick: handleCreateWorkspace
      },
      {
        id: 'open-workspace',
        leftSection: IconFolder,
        label: 'Open workspace',
        onClick: handleOpenWorkspace
      }
    );

    return items;
  }, [sortedWorkspaces, activeWorkspaceUid, preferences, handlePinWorkspace]);

  return (
    <StyledWrapper className={`app-titlebar ${isFullScreen ? 'fullscreen' : ''}`}>
      {createWorkspaceModalOpen && (
        <CreateWorkspace onClose={() => setCreateWorkspaceModalOpen(false)} />
      )}

      <div className="titlebar-content">
        {/* Left section: Home + Workspace */}
        <div className="titlebar-left">
          <ActionIcon
            onClick={handleHomeClick}
            label="Home"
            size="lg"
            className="home-button"
          >
            <IconHome size={16} stroke={1.5} />
          </ActionIcon>

          {/* Workspace Dropdown */}
          <MenuDropdown
            data-testid="workspace-menu"
            items={workspaceMenuItems}
            placement="bottom-start"
            selectedItemId={activeWorkspaceUid}
          >
            <WorkspaceName />
          </MenuDropdown>
        </div>

        {/* Center section: Bruno logo + text */}
        <div className="titlebar-center">
          <Bruno width={18} />
          <span className="bruno-text">Bruno</span>
        </div>

        {/* Right section: Action buttons */}
        <div className="titlebar-right">
          {/* Toggle sidebar */}
          <ActionIcon
            onClick={handleToggleSidebar}
            label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            size="lg"
            data-testid="toggle-sidebar-button"
          >
            <IconSidebarToggle collapsed={sidebarCollapsed} size={16} strokeWidth={1.5} />
          </ActionIcon>

          {/* Toggle devtools */}
          <ActionIcon
            onClick={handleToggleDevtools}
            label={isConsoleOpen ? 'Hide devtools' : 'Show devtools'}
            size="lg"
            data-testid="toggle-devtools-button"
          >
            <IconBottombarToggle collapsed={!isConsoleOpen} size={16} strokeWidth={1.5} />
          </ActionIcon>

          <ResponseLayoutToggle />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default AppTitleBar;
