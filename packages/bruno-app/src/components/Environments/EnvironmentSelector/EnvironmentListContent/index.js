import React, { useEffect, useMemo, useRef } from 'react';
import { IconPlus, IconDownload, IconSettings } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import ColorBadge from 'components/ColorBadge';
import SearchInput from 'components/SearchInput';

const EnvironmentListContent = ({
  environments,
  activeEnvironmentUid,
  description,
  onEnvironmentSelect,
  onSettingsClick,
  onCreateClick,
  onImportClick,
  searchText,
  setSearchText
}) => {
  const searchInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (searchText) {
        e.stopPropagation();
        setSearchText('');
      }
      searchInputRef.current?.blur();
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (document.activeElement === searchInputRef.current) {
        return;
      }

      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Ignore modifier keys and non-printable keys (except Backspace)
      if ((e.key.length !== 1 && e.key !== 'Backspace') || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const filteredEnvs = useMemo(() => {
    const trimmedSearchText = searchText?.trim()?.toLowerCase();
    if (!trimmedSearchText) {
      return environments || [];
    }
    return (environments || []).filter((env) => env.name.toLowerCase().includes(trimmedSearchText));
  }, [environments, searchText]);

  return (
    <div>
      {environments && environments.length > 0 ? (
        <>
          <div className="environment-list">
            <div className="env-list-search">
              <SearchInput
                ref={searchInputRef}
                placeholder="Search environments..."
                searchText={searchText}
                setSearchText={setSearchText}
                onKeyDown={handleKeyDown}
                className="w-full h-[30px] !px-0"
                leftIconClassName="!pl-2"
                data-testid="env-search-input"
                autoFocus={false}
                inputClassName="h-[30px] text-xs"
                iconSize={13}
              />
            </div>
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
            <button onClick={onImportClick} id="import-env" data-testid="empty-state-import-env-btn">
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
