import React from "react";
import Modal from "components/Modal/index";
import { IconBox } from '@tabler/icons';
import { useSelector } from "react-redux";
import StyledWrapper from './StyledWrapper';

const WorkspaceSelectModal = ({onClose, onSelect, title}) => {
  const { workspaces } = useSelector((state) => state.workspaces);

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title={title || "Select Workspace"}
        hideFooter={true}
        handleCancel={onClose}
      >
        <ul className="mb-2" >
          {(workspaces && workspaces.length) ? workspaces.map((w) => (
            <div className="workspace" key={w.uid} onClick={() => onSelect(w.uid)}>
              <IconBox size={18} strokeWidth={1.5}/> <span className="ml-2">{w.name}</span>
            </div>
          )) : (
            <div>No workspaces found</div>
          )}
        </ul>
      </Modal>
    </StyledWrapper>
  );
}

export default WorkspaceSelectModal;
