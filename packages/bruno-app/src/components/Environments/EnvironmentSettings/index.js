import Modal from 'components/Modal/index';
import React, { useState } from 'react';
import CreateEnvironment from './CreateEnvironment';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import ImportEnvironment from './ImportEnvironment';
import { IconFileAlert } from '@tabler/icons';

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
    <div className="text-center items-center flex flex-col">
      <IconFileAlert size={64} strokeWidth={1} />
      <span className="font-semibold mt-2">No environments found</span>
      <span className="font-extralight mt-2 text-zinc-500 dark:text-zinc-400">
        Get started by using the following buttons :
      </span>
      <div className="flex items-center justify-center mt-6">
        <SharedButton onClick={() => setTab('create')}>
          <span>Create Environment</span>
        </SharedButton>

        <span className="mx-4">Or</span>

        <SharedButton onClick={() => setTab('import')}>
          <span>Import Environment</span>
        </SharedButton>
      </div>
    </div>
  );
};

const EnvironmentSettings = ({ collection, onClose }) => {
  const [isModified, setIsModified] = useState(false);
  const { environments } = collection;
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [tab, setTab] = useState('default');
  if (!environments || !environments.length) {
    return (
      <StyledWrapper>
        <Modal size="md" title="Environments" handleCancel={onClose} hideCancel={true} hideFooter={true}>
          {tab === 'create' ? (
            <CreateEnvironment collection={collection} onClose={() => setTab('default')} />
          ) : tab === 'import' ? (
            <ImportEnvironment collection={collection} onClose={() => setTab('default')} />
          ) : (
            <></>
          )}
          <DefaultTab setTab={setTab} />
        </Modal>
      </StyledWrapper>
    );
  }

  return (
    <Modal size="lg" title="Environments" handleCancel={onClose} hideFooter={true}>
      <EnvironmentList
        selectedEnvironment={selectedEnvironment}
        setSelectedEnvironment={setSelectedEnvironment}
        collection={collection}
        isModified={isModified}
        setIsModified={setIsModified}
        onClose={onClose}
      />
    </Modal>
  );
};

export default EnvironmentSettings;
