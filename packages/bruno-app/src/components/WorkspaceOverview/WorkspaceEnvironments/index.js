import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import CreateEnvironment from './CreateEnvironment';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import { IconFileAlert } from '@tabler/icons';
import ImportEnvironment from './ImportEnvironment';

export const SharedButton = ({ children, className, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded bg-transparent px-2.5 py-2 w-fit text-xs font-semibold text-zinc-900 dark:text-zinc-50 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-700
        ${className}`}
    >
      {children}
    </button>
  );
};

const DefaultTab = ({ setTab }) => {
  return (
    <div className="empty-state">
      <IconFileAlert size={48} strokeWidth={1.5} />
      <div className="title">No Environments</div>
      <div className="actions">
        <button className="shared-button" onClick={() => setTab('create')}>
          Create Environment
        </button>
        <button className="shared-button" onClick={() => setTab('import')}>
          Import Environment
        </button>
      </div>
    </div>
  );
};

const WorkspaceEnvironments = ({ workspace }) => {
  const [isModified, setIsModified] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [tab, setTab] = useState('default');

  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);

  if (!globalEnvironments || !globalEnvironments.length) {
    return (
      <StyledWrapper>
        {tab === 'create' ? (
          <CreateEnvironment onClose={() => setTab('default')} />
        ) : tab === 'import' ? (
          <ImportEnvironment onClose={() => setTab('default')} />
        ) : (
          <DefaultTab setTab={setTab} />
        )}
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <EnvironmentList
        environments={globalEnvironments}
        activeEnvironmentUid={activeGlobalEnvironmentUid}
        selectedEnvironment={selectedEnvironment}
        setSelectedEnvironment={setSelectedEnvironment}
        isModified={isModified}
        setIsModified={setIsModified}
        collection={null}
      />
    </StyledWrapper>
  );
};

export default WorkspaceEnvironments;
