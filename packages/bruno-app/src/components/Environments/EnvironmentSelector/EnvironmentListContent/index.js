import React, { useState, useMemo } from 'react';
import { IconPlus, IconDownload, IconSettings, IconSearch, IconX } from '@tabler/icons';
import ToolHint from 'components/ToolHint';

const EnvironmentListContent = ({
  environments,
  activeEnvironmentUid,
  description,
  onEnvironmentSelect,
  onSettingsClick,
  onCreateClick,
  onImportClick
}) => {
  const [searchText, setSearchText] = useState('');

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  const clearSearch = () => {
    setSearchText('');
  };

  const filteredEnvironments = useMemo(() => {
    if (!searchText) {
      return environments || [];
    }
    return environments?.filter((env) => env.name.toLowerCase().includes(searchText.toLowerCase())) || [];
  }, [environments, searchText]);

  return (
    <div>
      {environments && environments.length > 0 ? (
        <>
          {/* Search Input */}
          <div className="relative px-2 py-1 search-input-container">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">
                <IconSearch size={16} strokeWidth={1.5} />
              </span>
            </div>
            <input
              type="text"
              name="environment-search"
              placeholder="Search environments..."
              id="environment-search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="block w-full pl-7 pr-8 py-1 sm:text-sm border rounded"
              value={searchText}
              onChange={handleSearchChange}
              onClick={(e) => e.stopPropagation()}
            />
            {searchText !== '' && (
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <span
                  className="close-icon cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSearch();
                  }}
                >
                  <IconX size={16} strokeWidth={1.5} />
                </span>
              </div>
            )}
          </div>

          <div className="environment-list">
            {/* No Environment Option - only show when not searching */}
            {!searchText && (
              <div className="dropdown-item no-environment" onClick={() => onEnvironmentSelect(null)}>
                <span>No Environment</span>
              </div>
            )}

            {/* Environment List */}
            {filteredEnvironments.length > 0 ? (
              <ToolHint
                anchorSelect="[data-tooltip-content]"
                place="right"
                positionStrategy="fixed"
                tooltipStyle={{
                  maxWidth: '200px',
                  wordWrap: 'break-word'
                }}
                delayShow={1000}
              >
                <div>
                  {filteredEnvironments.map((env) => (
                    <div
                      key={env.uid}
                      className={`dropdown-item ${env.uid === activeEnvironmentUid ? 'active' : ''}`}
                      onClick={() => onEnvironmentSelect(env)}
                      data-tooltip-content={env.name}
                      data-tooltip-hidden={env.name?.length < 90}
                    >
                      <span className="max-w-100% truncate no-wrap">{env.name}</span>
                    </div>
                  ))}
                </div>
              </ToolHint>
            ) : (
              searchText && (
                <div className="dropdown-item disabled">
                  <span className="ml-2 text-gray-500">No environments found</span>
                </div>
              )
            )}

            {/* Configure Button */}
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
