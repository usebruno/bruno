import React, { useState, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconArrowLeft, IconPlus, IconFolder, IconLock, IconDots, IconEdit, IconCopy, IconX, IconCategory, IconTrash, IconLogin } from '@tabler/icons';
import toast from 'react-hot-toast';

import { showHomePage } from 'providers/ReduxStore/slices/app';
import { switchWorkspace, openWorkspaceDialog } from 'providers/ReduxStore/slices/workspaces/actions';
import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import { sortWorkspaces } from 'utils/workspaces';

import Dropdown from 'components/Dropdown';
import CreateWorkspace from 'components/WorkspaceSidebar/CreateWorkspace';
import RenameWorkspace from './RenameWorkspace';
import DeleteWorkspace from './DeleteWorkspace';
import StyledWrapper from './StyledWrapper';

const ManageWorkspace = () => {
  const dispatch = useDispatch();
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const preferences = useSelector((state) => state.app.preferences);

  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);
  const [renameWorkspaceModal, setRenameWorkspaceModal] = useState({ open: false, workspace: null });
  const [deleteWorkspaceModal, setDeleteWorkspaceModal] = useState({ open: false, workspace: null });

  const dropdownRefs = useRef({});

  const sortedWorkspaces = useMemo(() => {
    return sortWorkspaces(workspaces, preferences);
  }, [workspaces, preferences]);

  const handleBack = () => {
    dispatch(showHomePage());
  };

  const handleOpenWorkspace = (workspace) => {
    dispatch(switchWorkspace(workspace.uid));
    dispatch(showHomePage());
    toast.success(`Switched to ${workspace.name}`);
  };

  const handleShowInFolder = (workspace) => {
    if (workspace.pathname) {
      dispatch(showInFolder(workspace.pathname)).catch(() => {
        toast.error('Error opening the folder');
      });
    }
  };

  const handleRenameClick = (workspace) => {
    dropdownRefs.current[workspace.uid]?.hide();
    setRenameWorkspaceModal({ open: true, workspace });
  };

  const handleCloseClick = (workspace) => {
    dropdownRefs.current[workspace.uid]?.hide();
    if (workspace.type === 'default') {
      toast.error('Cannot remove the default workspace');
      return;
    }
    setDeleteWorkspaceModal({ open: true, workspace });
  };

  const handleOpenWorkspaceDialog = async () => {
    try {
      await dispatch(openWorkspaceDialog());
    } catch (error) {
      toast.error(error.message || 'Failed to open workspace');
    }
  };

  const onDropdownCreate = (workspaceUid) => (ref) => {
    dropdownRefs.current[workspaceUid] = ref;
  };

  return (
    <StyledWrapper>
      {createWorkspaceModalOpen && (
        <CreateWorkspace onClose={() => setCreateWorkspaceModalOpen(false)} />
      )}

      {renameWorkspaceModal.open && renameWorkspaceModal.workspace && (
        <RenameWorkspace
          workspace={renameWorkspaceModal.workspace}
          onClose={() => setRenameWorkspaceModal({ open: false, workspace: null })}
        />
      )}

      {deleteWorkspaceModal.open && deleteWorkspaceModal.workspace && (
        <DeleteWorkspace
          workspace={deleteWorkspaceModal.workspace}
          onClose={() => setDeleteWorkspaceModal({ open: false, workspace: null })}
        />
      )}

      <div className="manage-workspace-header">
        <div className="header-left">
          <div className="back-button" onClick={handleBack}>
            <IconArrowLeft size={18} strokeWidth={1.5} />
          </div>
          <span className="header-title">Manage Workspace</span>
        </div>
        <button className="create-workspace-btn" onClick={() => setCreateWorkspaceModalOpen(true)}>
          <IconPlus size={14} strokeWidth={2} />
          <span>Create Workspace</span>
        </button>
      </div>

      <div className="workspace-list">
        {sortedWorkspaces.length === 0 ? (
          <div className="empty-state">
            <span>No workspaces found</span>
          </div>
        ) : (
          sortedWorkspaces.map((workspace) => {
            const isDefault = workspace.type === 'default';
            const isActive = workspace.uid === activeWorkspaceUid;

            return (
              <div key={workspace.uid} className="workspace-item">
                <div className="workspace-info">
                  <div className="workspace-name-row">
                    <span className={`workspace-icon ${isDefault ? 'default' : 'regular'}`}>
                      {isDefault ? (
                        <IconLock size={14} strokeWidth={1.5} />
                      ) : (
                        <IconCategory size={14} strokeWidth={1.5} />
                      )}
                    </span>
                    <span className="workspace-name">{workspace.name}</span>
                    {isDefault && <span className="default-badge">Default</span>}
                  </div>
                  {workspace.pathname && (
                    <div className="workspace-path">{workspace.pathname}</div>
                  )}
                </div>

                <div className="workspace-actions">
                  <button
                    className="action-btn"
                    onClick={() => handleOpenWorkspace(workspace)}
                  >
                    <IconLogin size={14} strokeWidth={1.5} />
                    <span>Open</span>
                  </button>
                  {workspace.pathname && workspace.type !== 'default' && (
                    <button
                      className="action-btn"
                      onClick={() => handleShowInFolder(workspace)}
                    >
                      <IconFolder size={14} strokeWidth={1.5} />
                      <span>Show in folder</span>
                    </button>
                  )}
                  {!isDefault && (
                    <Dropdown
                      style="new"
                      placement="bottom-end"
                      onCreate={onDropdownCreate(workspace.uid)}
                      icon={(
                        <button className="more-actions-btn">
                          <IconDots size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    >
                      <div className="dropdown-menu">
                        <div className="dropdown-item" onClick={() => handleRenameClick(workspace)}>
                          <IconEdit size={14} strokeWidth={1.5} />
                          <span>Rename</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleCloseClick(workspace)}>
                          <IconX size={14} strokeWidth={1.5} />
                          <span>Close</span>
                        </div>
                        <div className="dropdown-item danger" onClick={() => handleCloseClick(workspace)}>
                          <IconTrash size={14} strokeWidth={1.5} />
                          <span>Remove</span>
                        </div>
                      </div>
                    </Dropdown>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </StyledWrapper>
  );
};

export default ManageWorkspace;
