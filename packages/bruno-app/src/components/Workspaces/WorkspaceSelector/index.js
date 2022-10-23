import React, { useRef, forwardRef, useState, useEffect } from 'react';
import Dropdown from 'components/Dropdown';
import { IconCaretDown, IconBox, IconSwitch3, IconSettings } from '@tabler/icons';
import WorkspaceConfigurer from '../WorkspaceConfigurer';
import WorkspaceSelectModal from '../WorkspaceSelectModal';
import { useDispatch, useSelector } from 'react-redux';
import { selectWorkspace } from 'providers/ReduxStore/slices/workspaces';
import StyledWrapper from './StyledWrapper';

const WorkspaceSelector = () => {
  const dropdownTippyRef = useRef();
  const [openWorkspacesModal, setOpenWorkspacesModal] = useState(false);
  const [openSwitchWorkspaceModal, setOpenSwitchWorkspaceModal] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState({});
  const dispatch = useDispatch();

  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);

  useEffect(() => {
    setActiveWorkspace(workspaces.find((workspace) => workspace.uid === activeWorkspaceUid));
  }, [activeWorkspaceUid, workspaces]);

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="current-workspace flex justify-between items-center pl-2 pr-2 py-1 select-none">
        <div className="flex items-center">
          <span className="mr-2">
            <IconBox size={18} strokeWidth={1.5} />
          </span>
          <span>{activeWorkspace ? activeWorkspace.name : ''}</span>
        </div>
        <IconCaretDown className="caret" size={14} strokeWidth={2} />
      </div>
    );
  });

  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const handleSelectWorkspace = (workspaceUid) => {
    dispatch(selectWorkspace({ workspaceUid: workspaceUid }));
    setOpenSwitchWorkspaceModal(false);
  };

  return (
    <StyledWrapper>
      {openWorkspacesModal && <WorkspaceConfigurer onClose={() => setOpenWorkspacesModal(false)} />}
      {openSwitchWorkspaceModal && <WorkspaceSelectModal onSelect={handleSelectWorkspace} title="Switch Workspace" onClose={() => setOpenSwitchWorkspaceModal(false)} />}

      <div className="items-center cursor-pointer relative">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div className="dropdown-item" onClick={() => setOpenSwitchWorkspaceModal(true)}>
            <div className="pr-2 icon">
              <IconSwitch3 size={18} strokeWidth={1.5} />
            </div>
            <span>Switch Workspace</span>
          </div>

          <div className="dropdown-item" onClick={() => setOpenWorkspacesModal(true)}>
            <div className="pr-2 icon">
              <IconSettings size={18} strokeWidth={1.5} />
            </div>
            <span>Configure Workspaces</span>
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceSelector;
