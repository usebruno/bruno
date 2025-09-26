import Modal from 'components/Modal/index';
import React, { useState, useMemo } from 'react';
import CreateEnvironment from './CreateEnvironment';
import EnvironmentList from './EnvironmentList';
import StyledWrapper from './StyledWrapper';
import { IconFileAlert, IconSearch } from '@tabler/icons';
import ImportEnvironment from './ImportEnvironment/index';

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
      <span className="font-semibold mt-2">No Global Environments found</span>
      <div className="flex items-center justify-center mt-6">
        <SharedButton onClick={() => setTab('create')}>
          <span>Create Global Environment</span>
        </SharedButton>

        <span className="mx-4">Or</span>

        <SharedButton onClick={() => setTab('import')}>
          <span>Import Environment</span>
        </SharedButton>
      </div>
    </div>
  );
};

const EnvironmentSettings = ({ globalEnvironments, collection, onClose }) => {
  const [isModified, setIsModified] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const environments = globalEnvironments;
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [tab, setTab] = useState('default');

  // Filter environments based on search query
  const filteredEnvironments = useMemo(() => {
    if (!searchQuery.trim()) {
      return environments;
    }

    return environments?.filter(env =>
      env.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) || [];
  }, [environments, searchQuery]);

  if (!environments || !environments.length) {
    return (
      <StyledWrapper>
        <Modal size="md" title="Global Environments" handleCancel={onClose} hideCancel={true} hideFooter={true}>
          {tab === 'create' ? (
            <CreateEnvironment onClose={() => setTab('default')} />
          ) : tab === 'import' ? (
            <ImportEnvironment onClose={() => setTab('default')} />
          ) : (
            <DefaultTab setTab={setTab} />
          )}
        </Modal>
      </StyledWrapper>
    );
  }

  return (
    <Modal size="lg" title="Global Environments" handleCancel={onClose} hideFooter={true}>
      {/* Search input at the top of the configuration modal */}
      <div className="search-container mb-4 p-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        <div className="relative">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            type="text"
            placeholder="Search global environments..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {filteredEnvironments.length}
            {' '}
            of
            {' '}
            {environments.length}
            {' '}
            environments shown
          </div>
        )}
      </div>

      <EnvironmentList
        environments={filteredEnvironments}
        allEnvironments={environments}
        selectedEnvironment={selectedEnvironment}
        setSelectedEnvironment={setSelectedEnvironment}
        isModified={isModified}
        setIsModified={setIsModified}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        collection={collection}
      />
    </Modal>
  );
};

export default EnvironmentSettings;
