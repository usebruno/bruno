import React, { useEffect, useState } from "react";
import { IconEdit, IconTrash } from "@tabler/icons";
import RenameEnvironment from "../../RenameEnvironment";
import DeleteEnvironment from "../../DeleteEnvironment";
// import StyledWrapper from "./StyledWrapper";

const EnvironmentDetails = ({selected}) => {
  const [ openEditModal, setOpenEditModal] = useState(false);
  const [ openDeleteModal, setOpenDeleteModal] = useState(false);

  return (
    <div className="ml-10 flex-grow flex pt-4" style={{maxWidth: '700px'}}>
      <span>{selected.name}</span>
      <div className="flex gap-x-4 pl-4" >
        <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenEditModal(true)}/>
        <IconTrash className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenDeleteModal(true)}/>
      </div>
      {openEditModal && <RenameEnvironment onClose={() => setOpenEditModal(false)} environment={selected} />}
      {openDeleteModal && <DeleteEnvironment onClose={() => setOpenDeleteModal(false)} environment={selected} />}
    </div>

  );
};

export default EnvironmentDetails;
