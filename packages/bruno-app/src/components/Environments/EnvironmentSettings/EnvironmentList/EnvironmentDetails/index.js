import { useState } from 'react';
import CopyEnvironment from '../../CopyEnvironment';
import DeleteEnvironment from '../../DeleteEnvironment';
import RenameEnvironment from '../../RenameEnvironment';
import EnvironmentVariables from './EnvironmentVariables';
import { Copy, Database, FilePenLine, Trash2 } from 'lucide-react';

const EnvironmentDetails = ({ environment, collection }) => {
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
          <Database size={20} />
          <span className="ml-1 font-semibold">{environment.name}</span>
        </div>
        <div className="flex gap-x-2 pl-4">
          <button
            onClick={() => setOpenEditModal(true)}
            className="p-1 cursor-pointer hover:text-slate-950 dark:hover:text-white"
          >
            <FilePenLine size={16} />
          </button>
          <button
            onClick={() => setOpenCopyModal(true)}
            className="p-1 cursor-pointer hover:text-slate-950 dark:hover:text-white"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={() => setOpenDeleteModal(true)}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-400/10 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div>
        <EnvironmentVariables key={environment.uid} environment={environment} collection={collection} />
      </div>
    </div>
  );
};

export default EnvironmentDetails;
