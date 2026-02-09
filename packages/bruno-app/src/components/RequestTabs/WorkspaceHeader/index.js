import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { IconCategory, IconDots, IconEdit, IconX, IconCheck, IconFolder, IconUpload } from '@tabler/icons';
import { renameWorkspaceAction, exportWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import CloseWorkspace from 'components/Sidebar/CloseWorkspace';
import Dropdown from 'components/Dropdown';
import { getRevealInFolderLabel } from 'utils/common/platform';
import classNames from 'classnames';
import StyledWrapper from './StyledWrapper';

const WorkspaceHeader = ({ workspace }) => {
  const dispatch = useDispatch();

  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState('');
  const [workspaceNameError, setWorkspaceNameError] = useState('');
  const [closeWorkspaceModalOpen, setCloseWorkspaceModalOpen] = useState(false);
  const workspaceNameInputRef = useRef(null);
  const workspaceRenameContainerRef = useRef(null);
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

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

  if (!workspace) {
    return null;
  }

  const handleRenameWorkspaceClick = () => {
    dropdownTippyRef.current?.hide();
    setIsRenamingWorkspace(true);
    setWorkspaceNameInput(workspace.name);
    setWorkspaceNameError('');
    setTimeout(() => {
      workspaceNameInputRef.current?.focus();
      workspaceNameInputRef.current?.select();
    }, 50);
  };

  const handleCloseWorkspaceClick = () => {
    dropdownTippyRef.current?.hide();
    if (workspace.type === 'default') {
      toast.error('Cannot close the default workspace');
      return;
    }
    setCloseWorkspaceModalOpen(true);
  };

  const handleShowInFolder = () => {
    dropdownTippyRef.current?.hide();
    if (workspace.pathname) {
      dispatch(showInFolder(workspace.pathname)).catch(() => {
        toast.error('Error opening the folder');
      });
    }
  };

  const handleExportWorkspace = () => {
    dropdownTippyRef.current?.hide();
    dispatch(exportWorkspaceAction(workspace.uid))
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

    dispatch(renameWorkspaceAction(workspace.uid, workspaceNameInput))
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

  return (
    <StyledWrapper>
      {closeWorkspaceModalOpen && (
        <CloseWorkspace
          workspaceUid={workspace.uid}
          onClose={() => setCloseWorkspaceModalOpen(false)}
        />
      )}

      <div className="flex items-center gap-2 pt-2 pb-3 px-4">
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
              {workspaceNameError && (
                <span className="workspace-error">{workspaceNameError}</span>
              )}
            </div>
          ) : (
            <>
              <span className={classNames('workspace-name', { 'italic text-muted': !workspace?.name })}>
                {workspace?.name || 'Untitled Workspace'}
              </span>
              {workspace.type !== 'default' && (
                <Dropdown
                  placement="bottom-start"
                  onCreate={onDropdownCreate}
                  appendTo={() => document.body}
                  icon={<IconDots size={18} strokeWidth={1.5} className="cursor-pointer" />}
                >
                  <div className="dropdown-item" onClick={handleRenameWorkspaceClick}>
                    <div className="dropdown-icon">
                      <IconEdit size={16} strokeWidth={1.5} />
                    </div>
                    <span>Rename</span>
                  </div>
                  <div className="dropdown-item" onClick={handleShowInFolder}>
                    <div className="dropdown-icon">
                      <IconFolder size={16} strokeWidth={1.5} />
                    </div>
                    <span>{getRevealInFolderLabel()}</span>
                  </div>
                  <div className="dropdown-item" onClick={handleExportWorkspace}>
                    <div className="dropdown-icon">
                      <IconUpload size={16} strokeWidth={1.5} />
                    </div>
                    <span>Export</span>
                  </div>
                  <div className="dropdown-item" onClick={handleCloseWorkspaceClick}>
                    <div className="dropdown-icon">
                      <IconX size={16} strokeWidth={1.5} />
                    </div>
                    <span>Close</span>
                  </div>
                </Dropdown>
              )}
            </>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceHeader;
