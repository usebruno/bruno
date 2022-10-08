import Modal from "components/Modal/index";
import React from "react";
import { useSelector } from "react-redux";

const WorkspaceConfigurer = ({onClose}) => {
  const { workspaces } = useSelector((state) => state.workspaces);

  const onSubmit  = () => {
    onClose();
  }

  return (
    <Modal
      size="md"
      title="Workspaces"
      confirmText="Create"
      handleConfirm={onSubmit}
      handleCancel={onClose}
    >
      <ul className="mb-2">
      {workspaces && workspaces.length && workspaces.map((workspace) => (
        <div className="flex justify-between items-baseline w-4/5 mb-2">
          <li key={workspace.uid}>{workspace.name}</li>
          <button
            style={{backgroundColor: "var(--color-brand)"}}
            className="flex items-center h-full text-white active:bg-blue-600 font-bold text-xs px-4 py-2 ml-2 uppercase rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
            onClick={() => console.log("delete")}
          >
            <span style={{marginLeft: 5}}>Delete</span>
          </button>
        </div>
      ))}
      </ul>
    </Modal>
  )

}

export default WorkspaceConfigurer;
