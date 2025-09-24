import React, { useState, useMemo } from 'react';
import { IconPlus, IconDownload, IconSettings, IconSearch } from '@tabler/icons';
const EnvironmentListContent = ({
  environments,
  activeEnvironmentUid,
  description,
  onEnvironmentSelect,
  onSettingsClick,
  onCreateClick,
  onImportClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter environments based on search query
  const filteredEnvironments = useMemo(() => {
    if (!searchQuery.trim()) {
      return environments;
    }

    return environments?.filter(env =>
      env.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) || [];
  }, [environments, searchQuery]);
  return (
    <div>
      {environments && environments.length > 0 ? (
        <>
          {/* Search input - only show if there are environments */}
          <div className="search-container p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <IconSearch
                size={14}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <input
                type="text"
                placeholder="Search environments..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         placeholder-gray-500 dark:placeholder-gray-400
                         focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="environment-list">
            <div className="dropdown-item no-environment" onClick={() => onEnvironmentSelect(null)}>
              <span>No Environment</span>
            </div>
            <div>
              {filteredEnvironments.length > 0 ? (
                filteredEnvironments.map(env => (
                  <div
                    key={env.uid}
                    className={`dropdown-item ${env.uid === activeEnvironmentUid ? 'active' : ''}`}
                    onClick={() => onEnvironmentSelect(env)}
                  >
                    <span className="max-w-32 truncate no-wrap">{env.name}</span>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="dropdown-item text-gray-500 dark:text-gray-400 text-xs">
                  No environments found matching &quot;
                  {searchQuery}
                  &quot;
                </div>
              ) : null}
            </div>
            <div className="dropdown-item configure-button">
              <button onClick={onSettingsClick} id="configure-env">
                <IconSettings size={16} strokeWidth={1.5} />
                <span>Configure</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h3>Ready to get started?</h3>
          <p>{description}</p>
          <div className="space-y-2">
            <button onClick={onCreateClick} id="create-env">
              <IconPlus size={16} strokeWidth={1.5} />
              Create
            </button>
            <button onClick={onImportClick} id="import-env">
              <IconDownload size={16} strokeWidth={1.5} />
              Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvironmentListContent;
