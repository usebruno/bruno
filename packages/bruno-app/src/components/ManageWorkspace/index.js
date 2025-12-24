import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconArrowLeft, IconPlus, IconFolder, IconLock, IconDots, IconCategory, IconLogin } from '@tabler/icons';
import toast from 'react-hot-toast';

import { showHomePage } from 'providers/ReduxStore/slices/app';
import { switchWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import { sortWorkspaces } from 'utils/workspaces';

import CreateWorkspace from 'components/WorkspaceSidebar/CreateWorkspace';
import RenameWorkspace from './RenameWorkspace';
import DeleteWorkspace from './DeleteWorkspace';
import StyledWrapper from './StyledWrapper';
import MenuDropdown from 'ui/MenuDropdown/index';
import Button from 'ui/Button';

const ManageWorkspace = () => {
  const dispatch = useDispatch();
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const preferences = useSelector((state) => state.app.preferences);

  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);
  const [renameWorkspaceModal, setRenameWorkspaceModal] = useState({ open: false, workspace: null });
  const [deleteWorkspaceModal, setDeleteWorkspaceModal] = useState({ open: false, workspace: null });

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
    setRenameWorkspaceModal({ open: true, workspace });
  };

  const handleCloseClick = (workspace) => {
    if (workspace.type === 'default') {
      toast.error('Cannot remove the default workspace');
      return;
    }
    setDeleteWorkspaceModal({ open: true, workspace });
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
        <Button size="sm" onClick={() => setCreateWorkspaceModalOpen(true)} icon={<IconPlus size={14} strokeWidth={2} />}>
          Create Workspace
        </Button>
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
                    <MenuDropdown
                      placement="bottom-end"
                      items={[
                        { id: 'rename', label: 'Rename', onClick: () => handleRenameClick(workspace) },
                        { id: 'remove', label: 'Remove', onClick: () => handleCloseClick(workspace) }
                      ]}
                    >
                      <button className="more-actions-btn">
                        <IconDots size={14} strokeWidth={1.5} />
                      </button>
                    </MenuDropdown>
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
