import Modal from "components/Modal/index";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import WorkspaceItem from "./WorkspaceItem/index";
import AddModal from "./AddModal";

const WorkspaceConfigurer = ({onClose}) => {
  const { workspaces } = useSelector((state) => state.workspaces);
  const [openAddModal, setOpenAddModal] = useState(false);

  return (
    <Modal
      size="md"
      title="Workspaces"
      confirmText={"+ New Workspace"}
      handleConfirm={() => setOpenAddModal(true)}
      handleCancel={onClose}
      hideCancel={true}
    >
      <ul className="mb-2" >
        {workspaces && workspaces.length && workspaces.map((workspace) => (
          <WorkspaceItem workspace={workspace} />
        ))}
      </ul>
      {openAddModal && <AddModal onClose={() => setOpenAddModal(false)}/>}
    </Modal>
  )

}

export default WorkspaceConfigurer;
