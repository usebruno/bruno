import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import find from 'lodash/find';
import { IconSettings, IconCookie, IconTool, IconSearch, IconPalette, IconBrandGithub } from '@tabler/icons';
import Mousetrap from 'mousetrap';
import { getKeyBindingsForActionAllOS } from 'providers/Hotkeys/keyMappings';
import ToolHint from 'components/ToolHint';
import Cookies from 'components/Cookies';
import Notifications from 'components/Notifications';
import Portal from 'components/Portal';
import ThemeDropdown from './ThemeDropdown';
import { openConsole } from 'providers/ReduxStore/slices/logs';
import { setActiveWorkspaceTab } from 'providers/ReduxStore/slices/workspaceTabs';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useApp } from 'providers/App';
import StyledWrapper from './StyledWrapper';

const StatusBar = () => {
  const dispatch = useDispatch();
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const showHomePage = useSelector((state) => state.app.showHomePage);
  const showManageWorkspacePage = useSelector((state) => state.app.showManageWorkspacePage);
  const showApiSpecPage = useSelector((state) => state.app.showApiSpecPage);
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const activeTab = find(tabs, (t) => t.uid === activeTabUid);
  const logs = useSelector((state) => state.logs.logs);
  const [cookiesOpen, setCookiesOpen] = useState(false);
  const { version } = useApp();

  const errorCount = logs.filter((log) => log.type === 'error').length;

  const handleConsoleClick = () => {
    dispatch(openConsole());
  };

  const handlePreferencesClick = () => {
    if (showHomePage || showManageWorkspacePage || showApiSpecPage || !activeTabUid) {
      if (activeWorkspaceUid) {
        dispatch(setActiveWorkspaceTab({ workspaceUid: activeWorkspaceUid, type: 'preferences' }));
      }
    } else {
      dispatch(
        addTab({
          type: 'preferences',
          uid: activeTab?.collectionUid ? `${activeTab.collectionUid}-preferences` : 'preferences',
          collectionUid: activeTab?.collectionUid
        })
      );
    }
  };

  const openGlobalSearch = () => {
    const bindings = getKeyBindingsForActionAllOS('globalSearch') || [];
    bindings.forEach((binding) => {
      Mousetrap.trigger(binding);
    });
  };

  return (
    <StyledWrapper>
      {cookiesOpen && (
        <Portal>
          <Cookies
            onClose={() => {
              setCookiesOpen(false);
              document.querySelector('[data-trigger="cookies"]').focus();
            }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="cookies-title"
            aria-describedby="cookies-description"
          />
        </Portal>
      )}

      <div className="status-bar">
        <div className="status-bar-section">
          <div className="status-bar-group">
            <ToolHint text="Preferences" toolhintId="Preferences" place="top-start" offset={10}>
              <button
                className="status-bar-button preferences-button"
                data-trigger="preferences"
                onClick={handlePreferencesClick}
                tabIndex={0}
                aria-label="Open Preferences"
              >
                <IconSettings size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </ToolHint>

            <ThemeDropdown>
              <button
                className="status-bar-button"
                data-trigger="theme"
                tabIndex={0}
                aria-label="Change Theme"
              >
                <IconPalette size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </ThemeDropdown>

            <ToolHint text="Notifications" toolhintId="Notifications" place="top" offset={10}>
              <div className="status-bar-button">
                <Notifications />
              </div>
            </ToolHint>

            <ToolHint text="GitHub Repository" toolhintId="GitHub" place="top" offset={10}>
              <button
                className="status-bar-button"
                onClick={() => {
                  window?.ipcRenderer?.openExternal('https://github.com/usebruno/bruno');
                }}
                tabIndex={0}
                aria-label="Open GitHub Repository"
              >
                <IconBrandGithub size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </ToolHint>
          </div>
        </div>

        <div className="status-bar-section">
          <div className="flex items-center gap-3">
            <button
              className="status-bar-button"
              data-trigger="search"
              onClick={openGlobalSearch}
              tabIndex={0}
              aria-label="Global Search"
            >
              <div className="console-button-content">
                <IconSearch size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="console-label">Search</span>
              </div>
            </button>

            <button
              className="status-bar-button"
              data-trigger="cookies"
              onClick={() => setCookiesOpen(true)}
              tabIndex={0}
              aria-label="Open Cookies"
            >
              <div className="console-button-content">
                <IconCookie size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="console-label">Cookies</span>
              </div>
            </button>

            <button
              className={`status-bar-button ${errorCount > 0 ? 'has-errors' : ''}`}
              data-trigger="dev-tools"
              onClick={handleConsoleClick}
              tabIndex={0}
              aria-label={`Open Dev Tools${errorCount > 0 ? ` (${errorCount} errors)` : ''}`}
            >
              <div className="console-button-content">
                <IconTool size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="console-label">Dev Tools</span>
                {errorCount > 0 && (
                  <span className="error-count-inline">{errorCount}</span>
                )}
              </div>
            </button>

            <div className="status-bar-divider"></div>

            <div className="status-bar-version">
              v{version}
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default StatusBar;
