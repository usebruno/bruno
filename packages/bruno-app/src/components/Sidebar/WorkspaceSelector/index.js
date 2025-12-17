import { useState, forwardRef, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { IconPlus, IconChevronDown, IconCheck, IconFolder, IconPin, IconPinned } from '@tabler/icons';

import { savePreferences } from 'providers/ReduxStore/slices/app';
import { switchWorkspace, openWorkspaceDialog } from 'providers/ReduxStore/slices/workspaces/actions';
import { sortWorkspaces, toggleWorkspacePin } from 'utils/workspaces';

import Dropdown from 'components/Dropdown';
import CreateWorkspace from 'components/WorkspaceSidebar/CreateWorkspace';
import { toTitleCase } from 'utils/common/index';

const WorkspaceSelector = () => {
  const dispatch = useDispatch();

  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const preferences = useSelector((state) => state.app.preferences);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  const sortedWorkspaces = useMemo(() => {
    return sortWorkspaces(workspaces, preferences);
  }, [workspaces, preferences]);

  const [showDropdown, setShowDropdown] = useState(false);
  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);

  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const WorkspaceName = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="workspace-name-container" onClick={() => setShowDropdown(!showDropdown)}>
        <span className="workspace-name">{toTitleCase(activeWorkspace?.name) || 'Default Workspace'}</span>
        <IconChevronDown size={14} stroke={1.5} className="chevron-icon" />
      </div>
    );
  });

  const handleWorkspaceSwitch = (workspaceUid) => {
    dispatch(switchWorkspace(workspaceUid));
    setShowDropdown(false);
    toast.success(`Switched to ${workspaces.find((w) => w.uid === workspaceUid)?.name}`);
  };

  const handleOpenWorkspace = async () => {
    setShowDropdown(false);
    try {
      await dispatch(openWorkspaceDialog());
      toast.success('Workspace opened successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to open workspace');
    }
  };

  const handleCreateWorkspace = () => {
    setShowDropdown(false);
    setCreateWorkspaceModalOpen(true);
  };

  const handlePinWorkspace = useCallback((workspaceUid, e) => {
    e.preventDefault();
    e.stopPropagation();
    const newPreferences = toggleWorkspacePin(workspaceUid, preferences);
    dispatch(savePreferences(newPreferences));
  }, [dispatch, preferences]);

  return (
    <>
      {createWorkspaceModalOpen && (
        <CreateWorkspace onClose={() => setCreateWorkspaceModalOpen(false)} />
      )}

      <Dropdown
        onCreate={onDropdownCreate}
        icon={<WorkspaceName />}
        placement="bottom-start"
        style="new"
        visible={showDropdown}
        onClickOutside={() => setShowDropdown(false)}
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
    </>
  );
};

export default WorkspaceSelector;
