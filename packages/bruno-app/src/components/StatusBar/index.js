import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import find from 'lodash/find';
import { IconSettings, IconCookie, IconTool, IconSearch } from '@tabler/icons';
import Mousetrap from 'mousetrap';
import { getKeyBindingsForActionAllOS } from 'providers/Hotkeys/keyMappings';
import ToolHint from 'components/ToolHint';
import FeatureTip from 'components/FeatureTip';
import Preferences from 'components/Preferences';
import IconSidebarToggle from 'components/Icons/IconSidebarToggle';
import Cookies from 'components/Cookies';
import Notifications from 'components/Notifications';
import Portal from 'components/Portal';
import { showPreferences } from 'providers/ReduxStore/slices/app';
import { openConsole } from 'providers/ReduxStore/slices/logs';
import { useApp } from 'providers/App';
import StyledWrapper from './StyledWrapper';

const StatusBar = () => {
  const dispatch = useDispatch();
  const preferencesOpen = useSelector((state) => state.app.showPreferences);
  const logs = useSelector((state) => state.logs.logs);
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const [cookiesOpen, setCookiesOpen] = useState(false);
  const { version } = useApp();

  const errorCount = logs.filter((log) => log.type === 'error').length;

  // Check if active tab is a request type
  const isRequestTabActive = useMemo(() => {
    if (!activeTabUid || !tabs.length) return false;
    const activeTab = find(tabs, (t) => t.uid === activeTabUid);
    if (!activeTab) return false;
    const requestTypes = ['http-request', 'graphql-request', 'grpc-request', 'ws-request'];
    return requestTypes.includes(activeTab.type) || !activeTab.type || activeTab.type === 'request';
  }, [tabs, activeTabUid]);

  const handleConsoleClick = () => {
    dispatch(openConsole());
  };

  const openGlobalSearch = () => {
    const bindings = getKeyBindingsForActionAllOS('globalSearch') || [];
    bindings.forEach((binding) => {
      Mousetrap.trigger(binding);
    });
  };

  return (
    <StyledWrapper>
      {preferencesOpen && (
        <Portal>
          <Preferences
            onClose={() => {
              dispatch(showPreferences(false));
              document.querySelector('[data-trigger="preferences"]').focus();
            }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="preferences-title"
            aria-describedby="preferences-description"
          />
        </Portal>
      )}

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
                onClick={() => dispatch(showPreferences(true))}
                tabIndex={0}
                aria-label="Open Preferences"
              >
                <IconSettings size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </ToolHint>

            <ToolHint text="Notifications" toolhintId="Notifications" place="top" offset={10}>
              <div className="status-bar-button">
                <Notifications />
              </div>
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

            <FeatureTip
              tipId="dev-tools-intro"
              title="Dev Tools"
              description="View console logs, network requests, and performance metrics from your API calls. Great for debugging scripts and inspecting responses."
              placement="top"
              disabled={!isRequestTabActive}
            >
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
            </FeatureTip>

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
