import React, { useState } from "react";
import EditWorkspace from "../EditWorkspace";
import DeleteWorkspace from "../DeleteWorkspace";
import { IconEdit, IconTrash } from "@tabler/icons";
import StyledWrapper from "./StyledWrapper";

const WorkspaceItem = ({ workspace }) => {
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  return (
    <StyledWrapper>
      <div className="flex justify-between items-baseline mb-2" key={workspace.uid}>
        <li>{workspace.name}</li>
        <div className="flex gap-x-4">
          <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenEditModal(true)} />
          <IconTrash className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenDeleteModal(true)} />
        </div>
        {openEditModal && <EditWorkspace onClose={() => setOpenEditModal(false)} workspace={workspace} />}
        {openDeleteModal && <DeleteWorkspace onClose={() => setOpenDeleteModal(false)} workspace={workspace} />}
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceItem;
