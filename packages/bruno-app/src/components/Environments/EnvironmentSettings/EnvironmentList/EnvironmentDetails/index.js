import React, {useState } from "react";
import { IconEdit, IconTrash } from "@tabler/icons";
import RenameEnvironment from "../../RenameEnvironment";
import DeleteEnvironment from "../../DeleteEnvironment";

const EnvironmentDetails = ({environment, collection}) => {
  const [ openEditModal, setOpenEditModal] = useState(false);
  const [ openDeleteModal, setOpenDeleteModal] = useState(false);

  return (
    <div className="ml-6 flex-grow flex pt-6" style={{maxWidth: '700px'}}>
      {openEditModal && <RenameEnvironment onClose={() => setOpenEditModal(false)} environment={environment} collection={collection}/>}
      {openDeleteModal && <DeleteEnvironment onClose={() => setOpenDeleteModal(false)} environment={environment} collection={collection}/>}
      <div className="flex flex-grow">
        <div className="flex-grow font-medium">{environment.name}</div>
        <div className="flex gap-x-4 pl-4 pr-6">
          <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenEditModal(true)}/>
          <IconTrash className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenDeleteModal(true)}/>
        </div>
      </div>
    </div>

  );
};

export default EnvironmentDetails;
