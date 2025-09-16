import { IconCopy, IconDatabase, IconEdit, IconTrash } from '@tabler/icons';
import { useState } from 'react';
import CopyEnvironment from '../../CopyEnvironment';
import DeleteEnvironment from '../../DeleteEnvironment';
import RenameEnvironment from '../../RenameEnvironment';
import EnvironmentVariables from './EnvironmentVariables';
import ToolHint from 'components/ToolHint/index';

const EnvironmentDetails = ({ environment, collection, setIsModified, onClose }) => {
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
        <div className="flex gap-x-2 pl-2">
          <ToolHint text="Edit Environment" toolhintId={`edit-${environment.uid}`}>
            <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenEditModal(true)} />
          </ToolHint>
          <ToolHint text="Copy Environment" toolhintId={`copy-${environment.uid}`}>
            <IconCopy className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenCopyModal(true)} />
          </ToolHint>
          <ToolHint text="Delete Environment" toolhintId={`delete-${environment.uid}`}>
            <IconTrash
              className="cursor-pointer"
              size={20}
              strokeWidth={1.5}
              onClick={() => setOpenDeleteModal(true)}
            />
          </ToolHint>
        </div>
      </div>

      <div>
        <EnvironmentVariables
          environment={environment}
          collection={collection}
          setIsModified={setIsModified}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default EnvironmentDetails;
