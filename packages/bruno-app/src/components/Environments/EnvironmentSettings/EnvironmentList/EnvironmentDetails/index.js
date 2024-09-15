import { IconCopy, IconDatabase, IconEdit, IconTrash } from '@tabler/icons';
import { useState } from 'react';
import CopyEnvironment from '../../CopyEnvironment';
import DeleteEnvironment from '../../DeleteEnvironment';
import RenameEnvironment from '../../RenameEnvironment';
import EnvironmentVariables from './EnvironmentVariables';

const EnvironmentDetails = ({ environment, collection, setIsModified }) => {
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openCopyModal, setOpenCopyModal] = useState(false);

  return (
    <div className="px-6 flex-grow flex flex-col pt-6" style={{ maxWidth: '700px' }}>
      {openEditModal && (
        <RenameEnvironment onClose={() => setOpenEditModal(false)} environment={environment} collection={collection} />
      )}
      {openDeleteModal && (
        <DeleteEnvironment
          onClose={() => setOpenDeleteModal(false)}
          environment={environment}
          collection={collection}
        />
      )}
      {openCopyModal && (
        <CopyEnvironment onClose={() => setOpenCopyModal(false)} environment={environment} collection={collection} />
      )}
      <div className="flex">
        <div className="flex flex-grow items-center">
          <IconDatabase className="cursor-pointer" size={20} strokeWidth={1.5} />
          <span className="ml-1 font-semibold break-all">{environment.name}</span>
        </div>
        <div className="flex gap-x-4 pl-4">
          <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenEditModal(true)} />
          <IconCopy className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenCopyModal(true)} />
          <IconTrash className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenDeleteModal(true)} />
        </div>
      </div>

      <div>
        <EnvironmentVariables environment={environment} collection={collection} setIsModified={setIsModified} />
      </div>
    </div>
  );
};

export default EnvironmentDetails;
