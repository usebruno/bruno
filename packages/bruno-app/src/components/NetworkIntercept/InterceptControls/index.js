import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconPlayerPlay,
  IconPlayerStop,
  IconBrowser,
  IconTerminal2,
  IconChevronDown,
  IconX,
  IconCopy,
  IconBrandChrome,
  IconBrandFirefox,
  IconBrandEdge
} from '@tabler/icons-react';
import Button from 'ui/Button';
import {
  setProxyStatus,
  proxyStarted,
  proxyStopped,
  setAvailableBrowsers,
  addLaunchedBrowser,
  removeLaunchedBrowser,
  clearInterceptedRequests,
  setShowTerminalSetup,
  setTerminalCommands,
  selectProxyStatus,
  selectIsProxyRunning,
  selectAvailableBrowsers,
  selectLaunchedBrowsers,
  selectIsPaused,
  togglePause
} from 'providers/ReduxStore/slices/networkIntercept';
import { isElectron } from 'utils/common/platform';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const InterceptControls = () => {
  const dispatch = useDispatch();
  const proxyStatus = useSelector(selectProxyStatus);
  const isRunning = useSelector(selectIsProxyRunning);
  const availableBrowsers = useSelector(selectAvailableBrowsers);
  const launchedBrowsers = useSelector(selectLaunchedBrowsers);
  const isPaused = useSelector(selectIsPaused);
  const showTerminalSetup = useSelector((state) => state.networkIntercept.showTerminalSetup);
  const terminalCommands = useSelector((state) => state.networkIntercept.terminalCommands);

  const [showBrowserDropdown, setShowBrowserDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowBrowserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch available browsers when component mounts
  useEffect(() => {
    if (isElectron()) {
      fetchBrowsers();
    }
  }, []);

  const fetchBrowsers = async () => {
    try {
      const result = await window.ipcRenderer.invoke('network-intercept:get-browsers');
      if (result.success) {
        dispatch(setAvailableBrowsers(result.browsers));
      }
    } catch (error) {
      console.error('Failed to fetch browsers:', error);
    }
  };

  const handleStartProxy = async () => {
    if (!isElectron()) {
      toast.error('Network intercept is only available in the desktop app');
      return;
    }

    dispatch(setProxyStatus('starting'));
    try {
      const result = await window.ipcRenderer.invoke('network-intercept:start');
      if (result.success) {
        dispatch(proxyStarted({ port: result.port }));
        toast.success(`Proxy started on port ${result.port}`);
      } else {
        dispatch(setProxyStatus('stopped'));
        toast.error(result.error || 'Failed to start proxy');
      }
    } catch (error) {
      dispatch(setProxyStatus('stopped'));
      toast.error('Failed to start proxy');
    }
  };

  const handleStopProxy = async () => {
    dispatch(setProxyStatus('stopping'));
    try {
      await window.ipcRenderer.invoke('network-intercept:stop');
      dispatch(proxyStopped());
      toast.success('Proxy stopped');
    } catch (error) {
      toast.error('Failed to stop proxy');
    }
  };

  const handleLaunchBrowser = async (browserType) => {
    setShowBrowserDropdown(false);
    try {
      const result = await window.ipcRenderer.invoke('network-intercept:launch-browser', browserType);
      if (result.success) {
        dispatch(addLaunchedBrowser({
          id: result.id,
          type: result.type,
          name: result.name,
          launchedAt: result.launchedAt
        }));
        toast.success(`${result.name} launched with proxy`);
      } else {
        toast.error(result.error || 'Failed to launch browser');
      }
    } catch (error) {
      toast.error('Failed to launch browser');
    }
  };

  const handleCloseBrowser = async (browserId) => {
    try {
      await window.ipcRenderer.invoke('network-intercept:close-browser', browserId);
      dispatch(removeLaunchedBrowser(browserId));
    } catch (error) {
      toast.error('Failed to close browser');
    }
  };

  const handleShowTerminalSetup = async () => {
    try {
      const result = await window.ipcRenderer.invoke('network-intercept:get-terminal-setup');
      if (result.success) {
        dispatch(setTerminalCommands(result.commands));
        dispatch(setShowTerminalSetup(true));
      } else {
        toast.error(result.error || 'Proxy must be running first');
      }
    } catch (error) {
      toast.error('Failed to get terminal setup');
    }
  };

  const handleCopyCommand = (command) => {
    navigator.clipboard.writeText(command);
    toast.success('Command copied to clipboard');
  };

  const handleClearLogs = () => {
    dispatch(clearInterceptedRequests());
  };

  const getBrowserIcon = (type) => {
    switch (type) {
      case 'chrome':
        return <IconBrandChrome size={18} />;
      case 'firefox':
        return <IconBrandFirefox size={18} />;
      case 'edge':
        return <IconBrandEdge size={18} />;
      case 'brave':
        return <IconBrandChrome size={18} />; // Brave uses Chromium
      default:
        return <IconBrowser size={18} />;
    }
  };

  return (
    <StyledWrapper>
      {/* Start/Stop Button */}
      {!isRunning ? (
        <Button
          variant="filled"
          color="primary"
          size="sm"
          onClick={handleStartProxy}
          disabled={proxyStatus === 'starting'}
          icon={<IconPlayerPlay size={16} />}
        >
          {proxyStatus === 'starting' ? 'Starting...' : 'Start Intercept'}
        </Button>
      ) : (
        <Button
          variant="filled"
          color="danger"
          size="sm"
          onClick={handleStopProxy}
          disabled={proxyStatus === 'stopping'}
          icon={<IconPlayerStop size={16} />}
        >
          {proxyStatus === 'stopping' ? 'Stopping...' : 'Stop'}
        </Button>
      )}

      {/* Browser Launcher Dropdown */}
      {isRunning && (
        <div className="browser-dropdown" ref={dropdownRef}>
          <Button
            variant="filled"
            color="secondary"
            size="sm"
            onClick={() => setShowBrowserDropdown(!showBrowserDropdown)}
            icon={<IconBrowser size={16} />}
          >
            Open Browser
            <IconChevronDown size={14} style={{ marginLeft: '4px' }} />
          </Button>

          {showBrowserDropdown && (
            <div className="dropdown-menu">
              <div className="dropdown-header">Available Browsers</div>
              {availableBrowsers.length === 0 ? (
                <div className="dropdown-item disabled">No browsers detected</div>
              ) : (
                availableBrowsers.map((browser) => (
                  <div
                    key={browser.type}
                    className="dropdown-item"
                    onClick={() => handleLaunchBrowser(browser.type)}
                  >
                    <span className="browser-icon">{getBrowserIcon(browser.type)}</span>
                    <span className="browser-name">{browser.name}</span>
                  </div>
                ))
              )}
              <div className="dropdown-divider" />
              <div
                className="dropdown-item"
                onClick={handleShowTerminalSetup}
              >
                <IconTerminal2 size={18} />
                <span className="browser-name">Terminal Setup</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Launched Browsers */}
      {launchedBrowsers.length > 0 && (
        <div className="launched-browsers">
          {launchedBrowsers.map((browser) => (
            <div key={browser.id} className="launched-browser-badge">
              {getBrowserIcon(browser.type)}
              <span>{browser.name}</span>
              <span
                className="close-btn"
                onClick={() => handleCloseBrowser(browser.id)}
              >
                <IconX size={12} />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pause/Resume Button */}
      {isRunning && (
        <Button
          variant="filled"
          color={isPaused ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => dispatch(togglePause())}
          title={isPaused ? 'Resume logging' : 'Pause logging'}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      )}

      {/* Clear Logs Button */}
      <Button
        variant="filled"
        color="secondary"
        size="sm"
        onClick={handleClearLogs}
        title="Clear all logs"
      >
        Clear
      </Button>

      {/* Terminal Setup Modal */}
      {showTerminalSetup && terminalCommands && (
        <div className="terminal-setup-modal" onClick={() => dispatch(setShowTerminalSetup(false))}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Terminal Proxy Setup</h3>
              <span className="close-btn" onClick={() => dispatch(setShowTerminalSetup(false))}>
                <IconX size={20} />
              </span>
            </div>

            <div className="shell-section">
              <div className="shell-label">Bash / Zsh</div>
              <div className="command-box">
                <code>{terminalCommands.bash}</code>
                <Button
                  variant="filled"
                  color="primary"
                  size="xs"
                  onClick={() => handleCopyCommand(terminalCommands.bash)}
                  icon={<IconCopy size={14} />}
                />
              </div>
            </div>

            <div className="shell-section">
              <div className="shell-label">PowerShell</div>
              <div className="command-box">
                <code>{terminalCommands.powershell}</code>
                <Button
                  variant="filled"
                  color="primary"
                  size="xs"
                  onClick={() => handleCopyCommand(terminalCommands.powershell)}
                  icon={<IconCopy size={14} />}
                />
              </div>
            </div>

            <div className="shell-section">
              <div className="shell-label">Command Prompt (CMD)</div>
              <div className="command-box">
                <code>{terminalCommands.cmd}</code>
                <Button
                  variant="filled"
                  color="primary"
                  size="xs"
                  onClick={() => handleCopyCommand(terminalCommands.cmd)}
                  icon={<IconCopy size={14} />}
                />
              </div>
            </div>

            <div className="info-text">
              Run these commands in your terminal to route HTTP/HTTPS traffic through Bruno's proxy.
              This allows you to intercept requests from curl, wget, and other CLI tools.
            </div>
          </div>
        </div>
      )}
    </StyledWrapper>
  );
};

export default InterceptControls;
