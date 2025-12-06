import { IconCheck, IconChevronDown, IconFolder, IconHome, IconLayoutColumns, IconLayoutRows, IconPin, IconPinned, IconPlus } from '@tabler/icons';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { savePreferences, showHomePage, toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import { closeConsole, openConsole } from 'providers/ReduxStore/slices/logs';
import { openWorkspaceDialog, switchWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { sortWorkspaces, toggleWorkspacePin } from 'utils/workspaces';

import Bruno from 'components/Bruno';
import Dropdown from 'components/Dropdown';
import IconSidebarToggle from 'components/Icons/IconSidebarToggle';
import CreateWorkspace from 'components/WorkspaceSidebar/CreateWorkspace';

import IconBottombarToggle from 'components/Icons/IconBottombarToggle/index';
import StyledWrapper from './StyledWrapper';
import { toTitleCase } from 'utils/common/index';

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
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const workspaceDropdownTippyRef = useRef();
  const onWorkspaceDropdownCreate = (ref) => (workspaceDropdownTippyRef.current = ref);

  const WorkspaceName = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="workspace-name-container" onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}>
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
    setShowWorkspaceDropdown(false);
    toast.success(`Switched to ${workspaces.find((w) => w.uid === workspaceUid)?.name}`);
  };

  const handleOpenWorkspace = async () => {
    setShowWorkspaceDropdown(false);
    try {
      await dispatch(openWorkspaceDialog());
      toast.success('Workspace opened successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to open workspace');
    }
  };

  const handleCreateWorkspace = () => {
    setShowWorkspaceDropdown(false);
    setCreateWorkspaceModalOpen(true);
  };

  const handlePinWorkspace = useCallback((workspaceUid, e) => {
    e.preventDefault();
    e.stopPropagation();
    const newPreferences = toggleWorkspacePin(workspaceUid, preferences);
    dispatch(savePreferences(newPreferences));
  }, [dispatch, preferences]);

  const orientation = preferences?.layout?.responsePaneOrientation || 'horizontal';

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

  const handleToggleVerticalLayout = () => {
    const newOrientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
    const updatedPreferences = {
      ...preferences,
      layout: {
        ...preferences?.layout || {},
        responsePaneOrientation: newOrientation
      }
    };
    dispatch(savePreferences(updatedPreferences));
  };

  return (
    <StyledWrapper className={`app-titlebar ${isFullScreen ? 'fullscreen' : ''}`}>
      {createWorkspaceModalOpen && (
        <CreateWorkspace onClose={() => setCreateWorkspaceModalOpen(false)} />
      )}

      <div className="titlebar-content">
        {/* Left section: Home + Workspace */}
        <div className="titlebar-left">
          <button className="home-button" onClick={handleHomeClick} title="Home">
            <IconHome size={16} stroke={1.5} />
          </button>

          {/* Workspace Dropdown */}
          <Dropdown
            onCreate={onWorkspaceDropdownCreate}
            icon={<WorkspaceName />}
            placement="bottom-start"
            style="new"
            visible={showWorkspaceDropdown}
            onClickOutside={() => setShowWorkspaceDropdown(false)}
          >
            {sortedWorkspaces.map((workspace) => {
              const isActive = workspace.uid === activeWorkspaceUid;
              const isPinned = preferences?.workspaces?.pinnedWorkspaceUids?.includes(workspace.uid);

              return (
                <div
                  key={workspace.uid}
                  className={`dropdown-item workspace-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleWorkspaceSwitch(workspace.uid)}
                >
                  <span className="workspace-name">{toTitleCase(workspace.name)}</span>
                  <div className="workspace-actions">
                    {workspace.type !== 'default' && (
                      <button
                        className={`pin-btn ${isPinned ? 'pinned' : ''}`}
                        onClick={(e) => handlePinWorkspace(workspace.uid, e)}
                        title={isPinned ? 'Unpin workspace' : 'Pin workspace'}
                      >
                        {isPinned ? (
                          <IconPinned size={14} stroke={1.5} />
                        ) : (
                          <IconPin size={14} stroke={1.5} />
                        )}
                      </button>
                    )}
                    {isActive && <IconCheck size={16} stroke={1.5} className="check-icon" />}
                  </div>
                </div>
              );
            })}

            <div className="label-item border-top">Workspaces</div>

            <div className="dropdown-item" onClick={handleCreateWorkspace}>
              <IconPlus size={16} stroke={1.5} className="icon" />
              Create workspace
            </div>
            <div className="dropdown-item" onClick={handleOpenWorkspace}>
              <IconFolder size={16} stroke={1.5} className="icon" />
              Open workspace
            </div>
          </Dropdown>
        </div>

        {/* Center section: Bruno logo + text */}
        <div className="titlebar-center">
          <Bruno width={18} />
          <span className="bruno-text">Bruno</span>
        </div>

        {/* Right section: Action buttons */}
        <div className="titlebar-right">
          {/* Toggle sidebar */}
          <button
            className="titlebar-action-button"
            onClick={handleToggleSidebar}
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            aria-label="Toggle Sidebar"
            data-testid="toggle-sidebar-button"
          >
            <IconSidebarToggle collapsed={sidebarCollapsed} size={16} strokeWidth={1.5} />
          </button>

          {/* Toggle devtools */}
          <button
            className="titlebar-action-button"
            onClick={handleToggleDevtools}
            title={isConsoleOpen ? 'Hide devtools' : 'Show devtools'}
            aria-label="Toggle Devtools"
            data-testid="toggle-devtools-button"
          >
            <IconBottombarToggle collapsed={!isConsoleOpen} size={16} strokeWidth={1.5} />
          </button>

          {/* Toggle vertical layout */}
          <button
            className="titlebar-action-button"
            onClick={handleToggleVerticalLayout}
            title={orientation === 'horizontal' ? 'Switch to vertical layout' : 'Switch to horizontal layout'}
            aria-label="Toggle Vertical Layout"
            data-testid="toggle-vertical-layout-button"
          >
            {orientation === 'horizontal' ? (
              <IconLayoutColumns size={16} stroke={1.5} />
            ) : (
              <IconLayoutRows size={16} stroke={1.5} />
            )}
          </button>

        </div>
      </div>
    </StyledWrapper>
  );
};

export default AppTitleBar;
