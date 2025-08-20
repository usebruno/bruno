import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconSettings, IconCookie, IconTool } from '@tabler/icons';
import IconSidebarToggle from 'components/Icons/IconSidebarToggle';
import ToolHint from 'components/ToolHint';
import Preferences from 'components/Preferences';
import Cookies from 'components/Cookies';
import Notifications from 'components/Notifications';
import Portal from 'components/Portal';
import { showPreferences, toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import { openConsole } from 'providers/ReduxStore/slices/logs';
import { useApp } from 'providers/App';
import StyledWrapper from './StyledWrapper';

const StatusBar = () => {
  const dispatch = useDispatch();
  const preferencesOpen = useSelector((state) => state.app.showPreferences);
  const logs = useSelector((state) => state.logs.logs);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const [cookiesOpen, setCookiesOpen] = useState(false);
  const { version } = useApp();

  const errorCount = logs.filter(log => log.type === 'error').length;

  const handleConsoleClick = () => {
    dispatch(openConsole());
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
            <ToolHint text="Toggle Sidebar" toolhintId="Toggle Sidebar" place="top-start" offset={10}>
              <button
                className="status-bar-button"
                aria-label="Toggle Sidebar"
                onClick={() => dispatch(toggleSidebarCollapse())}
              >
                <IconSidebarToggle collapsed={sidebarCollapsed} size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </ToolHint>

            <ToolHint text="Preferences" toolhintId="Preferences" place="top-start" offset={10}>
              <button
                className="status-bar-button"
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