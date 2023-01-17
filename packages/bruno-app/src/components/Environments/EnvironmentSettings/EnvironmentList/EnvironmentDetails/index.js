import React, { useState } from 'react';
import { IconEdit, IconTrash, IconDatabase } from '@tabler/icons';
import EnvironmentVariables from './EnvironmentVariables';
import RenameEnvironment from '../../RenameEnvironment';
import DeleteEnvironment from '../../DeleteEnvironment';

const EnvironmentDetails = ({ environment, collection }) => {
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  return (
    <div className="px-6 flex-grow flex flex-col pt-6" style={{ maxWidth: '700px' }}>
      {openEditModal && <RenameEnvironment onClose={() => setOpenEditModal(false)} environment={environment} collection={collection} />}
      {openDeleteModal && <DeleteEnvironment onClose={() => setOpenDeleteModal(false)} environment={environment} collection={collection} />}
      <div className="flex">
        <div className="flex flex-grow items-center">
          <IconDatabase className="cursor-pointer" size={20} strokeWidth={1.5} />
          <span className="ml-1 font-semibold">{environment.name}</span>
        </div>
        <div className="flex gap-x-4 pl-4">
          <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenEditModal(true)} />
          <IconTrash className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenDeleteModal(true)} />
        </div>
      </div>

      <div>
        <EnvironmentVariables key={environment.uid} environment={environment} collection={collection} />
      </div>
    </div>
  );
};

export default EnvironmentDetails;
