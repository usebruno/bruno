import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconSettings, IconCookie, IconHeart, IconTerminal, IconBrandGit, IconAlertCircle } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import Preferences from 'components/Preferences';
import Cookies from 'components/Cookies';
import GoldenEdition from 'components/Sidebar/GoldenEdition';
import Notifications from 'components/Notifications';
import Portal from 'components/Portal';
import { showPreferences } from 'providers/ReduxStore/slices/app';
import { openTerminal } from 'providers/ReduxStore/slices/logs';
import { useApp } from 'providers/App';
import StyledWrapper from './StyledWrapper';

const StatusBar = () => {
  const dispatch = useDispatch();
  const preferencesOpen = useSelector((state) => state.app.showPreferences);
  const logs = useSelector((state) => state.logs.logs);
  const [goldenEditionOpen, setGoldenEditionOpen] = useState(false);
  const [cookiesOpen, setCookiesOpen] = useState(false);
  const { version } = useApp();

  const errorCount = logs.filter(log => log.type === 'error').length;

  const handleTerminalClick = () => {
    dispatch(openTerminal());
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

      {goldenEditionOpen && (
        <Portal>
          <GoldenEdition
            onClose={() => {
              setGoldenEditionOpen(false);
              document.querySelector('[data-trigger="golden-edition"]').focus();
            }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="golden-edition-title"
            aria-describedby="golden-edition-description"
          />
        </Portal>
      )}

      <div className="status-bar">
        <div className="status-bar-section">
          <div className="status-bar-group">
            <button
              className="status-bar-button"
              data-trigger="preferences"
              onClick={() => dispatch(showPreferences(true))}
              tabIndex={0}
              aria-label="Open Preferences"
            >
              <ToolHint text="Pref." toolhintId="Preferences" place="top" offset={10}>
                <IconSettings size={16} strokeWidth={1.5} aria-hidden="true" />
              </ToolHint>
            </button>
            
            <button
              className="status-bar-button"
              data-trigger="cookies"
              onClick={() => setCookiesOpen(true)}
              tabIndex={0}
              aria-label="Open Cookies Settings"
            >
              <ToolHint text="Cookies" toolhintId="Cookies" place="top" offset={10}>
                <IconCookie size={16} strokeWidth={1.5} aria-hidden="true" />
              </ToolHint>
            </button>
            
            <button
              className="status-bar-button golden-edition"
              data-trigger="golden-edition"
              onClick={() => setGoldenEditionOpen(true)}
              tabIndex={0}
              aria-label="Open Golden Edition"
            >
              <ToolHint text="Golden Edition" toolhintId="Golden Edition" place="top" offset={10}>
                <IconHeart size={16} strokeWidth={1.5} aria-hidden="true" />
              </ToolHint>
            </button>
            
            <div className="status-bar-notifications">
              <Notifications />
            </div>
          </div>
        </div>

        <div className="status-bar-section">
          <div className="status-bar-group">
            <button
              className={`status-bar-button terminal-button ${errorCount > 0 ? 'has-errors' : ''}`}
              data-trigger="terminal"
              onClick={handleTerminalClick}
              tabIndex={0}
              aria-label={`Open Terminal${errorCount > 0 ? ` (${errorCount} errors)` : ''}`}
            >
              <ToolHint text={`Terminal${errorCount > 0 ? ` (${errorCount} errors)` : ''}`} toolhintId="Terminal" place="top" offset={10}>
                <div className="terminal-button-content">
                  <IconTerminal size={16} strokeWidth={1.5} aria-hidden="true" />
                  <span className="terminal-label">Terminal</span>
                  {errorCount > 0 && (
                    <span className="error-count-inline">{errorCount}</span>
                  )}
                </div>
              </ToolHint>
            </button>
            
            {/* <button
              className="status-bar-button"
              data-trigger="git"
              onClick={() => {
                console.log('Git clicked');
              }}
              tabIndex={0}
              aria-label="Open Git"
            >
              <ToolHint text="Git" toolhintId="Git" place="top" offset={10}>
                <IconBrandGit size={16} strokeWidth={1.5} aria-hidden="true" />
              </ToolHint>
            </button> */}
            
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