import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconPlus, IconDownload, IconSettings, IconSearch, IconX } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import ColorBadge from 'components/ColorBadge';

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
  const searchInputRef = useRef(null);

  // Handle keydown events for the search input
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (searchText) {
        e.stopPropagation();
        setSearchText('');
      }
      searchInputRef.current?.blur();
    }
  };

  // Handle global keydown events for the search input
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (document.activeElement === searchInputRef.current) {
        return;
      }

      // Ignore if user is already focused on an input or textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Ignore modifier keys and non-printable keys (except Backspace)
      if ((e.key.length !== 1 && e.key !== 'Backspace') || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Focus the search input
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Filter environments based on search text
  const filteredEnvs = useMemo(() => {
    const trimmedSearchText = searchText?.trim()?.toLowerCase();
    if (!trimmedSearchText) {
      return environments || [];
    }
    return (environments || []).filter((env) =>
      env?.name?.toLowerCase()?.includes(trimmedSearchText)
    );
  }, [environments, searchText]);

  return (
    <div>
      {environments && environments.length > 0 ? (
        <>
          <div className="environment-list">
            {environments.length >= 0 && (
              <div className="env-list-search">
                <IconSearch size={13} strokeWidth={1.5} className="env-list-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search environments..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="env-list-search-input"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-testid="env-search-input"
                />
                {searchText && (
                  <button
                    className="env-list-search-clear"
                    title="Clear search"
                    onClick={() => setSearchText('')}
                    onMouseDown={(e) => e.preventDefault()}
                    data-testid="env-search-clear-btn"
                  >
                    <IconX size={12} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )}
            <div
              className={`dropdown-item no-environment ${!activeEnvironmentUid ? 'dropdown-item-active' : ''}`}
              onClick={() => onEnvironmentSelect(null)}
              data-testid="env-no-environment-item"
            >
              <span className="w-2 shrink-0" />
              <span>No Environment</span>
            </div>
            <ToolHint
              tooltipId="environment-name-tooltip"
              place="right"
              positionStrategy="fixed"
              tooltipStyle={{
                maxWidth: '200px',
                wordWrap: 'break-word'
              }}
              delayShow={1000}
            >
              <div>
                {filteredEnvs.length === 0 && searchText ? (
                  <div className="text-center text-xs opacity-50 py-2 italic" data-testid="env-no-results">
                    No results found
                  </div>
                ) : (
                  filteredEnvs.map((env) => (
                    <div
                      key={env.uid}
                      className={`dropdown-item ${env.uid === activeEnvironmentUid ? 'dropdown-item-active' : ''}`}
                      onClick={() => onEnvironmentSelect(env)}
                      data-tooltip-id="environment-name-tooltip"
                      data-tooltip-content={env.name}
                      data-tooltip-hidden={env.name?.length < 90}
                      data-testid="env-list-item"
                    >
                      <ColorBadge color={env.color} size={8} />
                      <span className="max-w-100% truncate no-wrap">{env.name}</span>
                    </div>
                  ))
                )}
              </div>
            </ToolHint>
            <div className="dropdown-item configure-button">
              <button onClick={onSettingsClick} id="configure-env" data-testid="configure-env">
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
