import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconCategory, IconDots, IconEdit, IconX, IconCheck, IconFolder, IconUpload } from '@tabler/icons';
import { renameWorkspaceAction, exportWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import CloseWorkspace from 'components/Sidebar/CloseWorkspace';
import WorkspaceOverview from './WorkspaceOverview';
import WorkspaceEnvironments from './WorkspaceEnvironments';
import Preferences from 'components/Preferences';
import WorkspaceTabs from 'components/WorkspaceTabs';
import StyledWrapper from './StyledWrapper';
import Dropdown from 'components/Dropdown';
import { getRevealInFolderLabel } from 'utils/common/platform';
import { getWorkspaceDisplayName } from 'components/AppTitleBar';
import classNames from 'classnames';

const WorkspaceHome = () => {
  const dispatch = useDispatch();
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const workspaceTabs = useSelector((state) => state.workspaceTabs);
  const activeTabUid = workspaceTabs.activeTabUid;
  const activeTab = workspaceTabs.tabs.find((t) => t.uid === activeTabUid);

  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState('');
  const [workspaceNameError, setWorkspaceNameError] = useState('');
  const [closeWorkspaceModalOpen, setCloseWorkspaceModalOpen] = useState(false);
  const workspaceNameInputRef = useRef(null);
  const workspaceRenameContainerRef = useRef(null);
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  useEffect(() => {
    if (!isRenamingWorkspace) return;

    const handleClickOutside = (event) => {
      if (workspaceRenameContainerRef.current && !workspaceRenameContainerRef.current.contains(event.target)) {
        handleCancelWorkspaceRename();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRenamingWorkspace]);

  if (!activeWorkspace) {
    return null;
  }

  const handleRenameWorkspaceClick = () => {
    dropdownTippyRef.current?.hide();
    setIsRenamingWorkspace(true);
    setWorkspaceNameInput(activeWorkspace.name);
    setWorkspaceNameError('');
    setTimeout(() => {
      workspaceNameInputRef.current?.focus();
      workspaceNameInputRef.current?.select();
    }, 50);
  };

  const handleCloseWorkspaceClick = () => {
    dropdownTippyRef.current?.hide();
    if (activeWorkspace.type === 'default') {
      toast.error('Cannot close the default workspace');
      return;
    }
    setCloseWorkspaceModalOpen(true);
  };

  const handleShowInFolder = () => {
    dropdownTippyRef.current?.hide();
    if (activeWorkspace.pathname) {
      dispatch(showInFolder(activeWorkspace.pathname)).catch((error) => {
        toast.error('Error opening the folder');
      });
    }
  };

  const handleExportWorkspace = () => {
    dropdownTippyRef.current?.hide();
    dispatch(exportWorkspaceAction(activeWorkspace.uid))
      .then((result) => {
        if (!result.canceled) {
          toast.success('Workspace exported successfully');
        }
      })
      .catch((error) => {
        toast.error(error?.message || 'Error exporting workspace');
      });
  };

  const validateWorkspaceName = (name) => {
    if (!name || name.trim() === '') {
      return 'Name is required';
    }
    if (name.length < 1) {
      return 'Must be at least 1 character';
    }
    if (name.length > 255) {
      return 'Must be 255 characters or less';
    }
    return null;
  };

  const handleSaveWorkspaceRename = () => {
    const error = validateWorkspaceName(workspaceNameInput);
    if (error) {
      setWorkspaceNameError(error);
      return;
    }

    dispatch(renameWorkspaceAction(activeWorkspace.uid, workspaceNameInput))
      .then(() => {
        toast.success('Workspace renamed!');
        setIsRenamingWorkspace(false);
        setWorkspaceNameInput('');
        setWorkspaceNameError('');
      })
      .catch((err) => {
        toast.error(err?.message || 'An error occurred while renaming the workspace');
        setWorkspaceNameError(err?.message || 'Failed to rename workspace');
      });
  };

  const handleCancelWorkspaceRename = () => {
    setIsRenamingWorkspace(false);
    setWorkspaceNameInput('');
    setWorkspaceNameError('');
  };

  const handleWorkspaceNameChange = (e) => {
    setWorkspaceNameInput(e.target.value);
    if (workspaceNameError) {
      setWorkspaceNameError('');
    }
  };

  const handleWorkspaceNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveWorkspaceRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelWorkspaceRename();
    }
  };

  const renderTabContent = () => {
    if (!activeTab) return null;

    switch (activeTab.type) {
      case 'overview':
        return <WorkspaceOverview workspace={activeWorkspace} />;
      case 'environments':
        return <WorkspaceEnvironments workspace={activeWorkspace} />;
      case 'preferences':
        return <Preferences />;
      default:
        return null;
    }
  };

  return (
    <StyledWrapper className="h-full">
      <div className="h-full flex flex-row">
        {closeWorkspaceModalOpen && (
          <CloseWorkspace
            workspaceUid={activeWorkspace.uid}
            onClose={() => setCloseWorkspaceModalOpen(false)}
          />
        )}

        <div className="main-content">
          <div className="workspace-header">
            <div className="workspace-title">
              <IconCategory size={20} strokeWidth={1.5} />
              {isRenamingWorkspace ? (
                <div className="workspace-rename-container" ref={workspaceRenameContainerRef}>
                  <input
                    ref={workspaceNameInputRef}
                    type="text"
                    className="workspace-name-input"
                    value={workspaceNameInput}
                    onChange={handleWorkspaceNameChange}
                    onKeyDown={handleWorkspaceNameKeyDown}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  <div className="inline-actions">
                    <button
                      className="inline-action-btn save"
                      onClick={handleSaveWorkspaceRename}
                      onMouseDown={(e) => e.preventDefault()}
                      title="Save"
                    >
                      <IconCheck size={14} strokeWidth={2} />
                    </button>
                    <button
                      className="inline-action-btn cancel"
                      onClick={handleCancelWorkspaceRename}
                      onMouseDown={(e) => e.preventDefault()}
                      title="Cancel"
                    >
                      <IconX size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ) : (
                <span className={classNames('workspace-name', { 'italic text-muted': !activeWorkspace?.name })}>{getWorkspaceDisplayName(activeWorkspace.name)}</span>
              )}
            </div>

            {!isRenamingWorkspace && activeWorkspace.type !== 'default' && (
              <Dropdown
                style="new"
                placement="bottom-end"
                onCreate={onDropdownCreate}
                icon={<IconDots size={18} strokeWidth={1.5} className="cursor-pointer" />}
              >
                <div className="workspace-menu-dropdown">
                  <div className="dropdown-item" onClick={handleRenameWorkspaceClick}>
                    <IconEdit size={16} strokeWidth={1.5} />
                    <span>Rename</span>
                  </div>
                  <div className="dropdown-item" onClick={handleShowInFolder}>
                    <IconFolder size={16} strokeWidth={1.5} />
                    <span>{getRevealInFolderLabel()}</span>
                  </div>
                  <div className="dropdown-item" onClick={handleExportWorkspace}>
                    <IconUpload size={16} strokeWidth={1.5} />
                    <span>Export</span>
                  </div>
                  <div className="dropdown-item" onClick={handleCloseWorkspaceClick}>
                    <IconX size={16} strokeWidth={1.5} />
                    <span>Close</span>
                  </div>
                </div>
              </Dropdown>
            )}

            {workspaceNameError && isRenamingWorkspace && (
              <div className="workspace-error">{workspaceNameError}</div>
            )}
          </div>

          <WorkspaceTabs workspaceUid={activeWorkspace.uid} />

          <div className="tab-content">{renderTabContent()}</div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceHome;
