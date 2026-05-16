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
  IconBrandEdge,
  IconInfoCircle
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
  selectProxyPort,
  togglePause
} from 'providers/ReduxStore/slices/networkIntercept';
import { isElectron, isMacOS, isWindowsOS, isLinuxOS } from 'utils/common/platform';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const InterceptControls = () => {
  const dispatch = useDispatch();
  const proxyStatus = useSelector(selectProxyStatus);
  const isRunning = useSelector(selectIsProxyRunning);
  const proxyPort = useSelector(selectProxyPort);
  const availableBrowsers = useSelector(selectAvailableBrowsers);
  const launchedBrowsers = useSelector(selectLaunchedBrowsers);
  const isPaused = useSelector(selectIsPaused);
  const showTerminalSetup = useSelector((state) => state.networkIntercept.showTerminalSetup);
  const terminalCommands = useSelector((state) => state.networkIntercept.terminalCommands);

  const [showBrowserDropdown, setShowBrowserDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [showSystemSetup, setShowSystemSetup] = useState(false);
  const [activeOsTab, setActiveOsTab] = useState('macos');
  const [isSettingProxy, setIsSettingProxy] = useState(false);
  const [isSystemProxySet, setIsSystemProxySet] = useState(false);
  const [systemSetupInfo, setSystemSetupInfo] = useState({
    caPath: '',
    caError: ''
  });

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

  // Fetch available browsers and detect OS when component mounts
  useEffect(() => {
    if (isElectron()) {
      fetchBrowsers();
    }

    if (isWindowsOS()) {
      setActiveOsTab('windows');
    } else if (isLinuxOS()) {
      setActiveOsTab('linux');
    } else {
      setActiveOsTab('macos');
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

  const handleShowSystemSetup = async () => {
    if (!isElectron()) {
      toast.error('Network intercept is only available in the desktop app');
      return;
    }
    try {
      const result = await window.ipcRenderer.invoke('network-intercept:get-ca-cert');
      if (result.success) {
        setSystemSetupInfo({
          caPath: result.path || '',
          caError: ''
        });
      } else {
        setSystemSetupInfo({
          caPath: '',
          caError: result.error || 'Failed to load CA certificate info'
        });
      }
    } catch (error) {
      setSystemSetupInfo({
        caPath: '',
        caError: 'Failed to load CA certificate info'
      });
    }
    setShowSystemSetup(true);
  };

  const copyText = (text, message = 'Copied') => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const handleSetSystemProxy = async () => {
    setIsSettingProxy(true);
    try {
      const result = await window.ipcRenderer.invoke('network-intercept:set-system-proxy');
      if (result.success) {
        setIsSystemProxySet(true);
        toast.success('System proxy set successfully');
      } else {
        toast.error(result.error || 'Failed to set system proxy');
      }
    } catch (error) {
      toast.error('Failed to set system proxy');
    } finally {
      setIsSettingProxy(false);
    }
  };

  const handleClearSystemProxy = async () => {
    setIsSettingProxy(true);
    try {
      const result = await window.ipcRenderer.invoke('network-intercept:clear-system-proxy');
      if (result.success) {
        setIsSystemProxySet(false);
        toast.success('System proxy cleared successfully');
      } else {
        toast.error(result.error || 'Failed to clear system proxy');
      }
    } catch (error) {
      toast.error('Failed to clear system proxy');
    } finally {
      setIsSettingProxy(false);
    }
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
              <div
                className="dropdown-item"
                onClick={handleShowSystemSetup}
              >
                <IconInfoCircle size={18} />
                <span className="browser-name">System-wide Setup</span>
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

      {/* System-wide Setup Modal */}
      {showSystemSetup && (
        <div className="system-setup-modal" onClick={() => setShowSystemSetup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>System-wide Proxy Setup (Manual)</h3>
              <span className="close-btn" onClick={() => setShowSystemSetup(false)}>
                <IconX size={20} />
              </span>
            </div>

            <div className="note">
              <IconInfoCircle size={16} />
              <div className="note-content">
                <span>
                  This does not change your system settings automatically unless you use the buttons below.
                  Remember to revert your system proxy when done.
                </span>
                <div className="auto-buttons">
                  {!isSystemProxySet ? (
                    <Button
                      variant="filled"
                      color="primary"
                      size="xs"
                      onClick={handleSetSystemProxy}
                      disabled={isSettingProxy}
                    >
                      {isSettingProxy ? 'Setting...' : 'Auto Set System Proxy'}
                    </Button>
                  ) : (
                    <Button
                      variant="filled"
                      color="danger"
                      size="xs"
                      onClick={handleClearSystemProxy}
                      disabled={isSettingProxy}
                    >
                      {isSettingProxy ? 'Clearing...' : 'Auto Clear System Proxy'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="proxy-grid">
              <div className="proxy-item">
                <div className="proxy-label">Proxy URL</div>
                <div className="proxy-value">http://127.0.0.1:{proxyPort || '8899'}</div>
                <Button
                  variant="filled"
                  color="primary"
                  size="xs"
                  onClick={() => copyText(`http://127.0.0.1:${proxyPort || 8899}`)}
                  icon={<IconCopy size={14} />}
                />
              </div>
              <div className="proxy-item">
                <div className="proxy-label">Host</div>
                <div className="proxy-value">127.0.0.1</div>
                <Button
                  variant="filled"
                  color="primary"
                  size="xs"
                  onClick={() => copyText('127.0.0.1')}
                  icon={<IconCopy size={14} />}
                />
              </div>
              <div className="proxy-item">
                <div className="proxy-label">Port</div>
                <div className="proxy-value">{proxyPort || '8899'}</div>
                <Button
                  variant="filled"
                  color="primary"
                  size="xs"
                  onClick={() => copyText(String(proxyPort || 8899))}
                  icon={<IconCopy size={14} />}
                />
              </div>
              <div className="proxy-item">
                <div className="proxy-label">CA certificate</div>
                <div className="proxy-value trunc">
                  {systemSetupInfo.caPath || 'Unknown path'}
                </div>
                <Button
                  variant="filled"
                  color="primary"
                  size="xs"
                  disabled={!systemSetupInfo.caPath}
                  onClick={() => systemSetupInfo.caPath && copyText(systemSetupInfo.caPath)}
                  icon={<IconCopy size={14} />}
                />
              </div>
            </div>

            {systemSetupInfo.caError && (
              <div className="warning-text">{systemSetupInfo.caError}</div>
            )}

            <div className="os-tabs">
              <div
                className={`os-tab ${activeOsTab === 'macos' ? 'active' : ''}`}
                onClick={() => setActiveOsTab('macos')}
              >
                macOS
              </div>
              <div
                className={`os-tab ${activeOsTab === 'windows' ? 'active' : ''}`}
                onClick={() => setActiveOsTab('windows')}
              >
                Windows
              </div>
              <div
                className={`os-tab ${activeOsTab === 'linux' ? 'active' : ''}`}
                onClick={() => setActiveOsTab('linux')}
              >
                Linux
              </div>
            </div>

            {activeOsTab === 'macos' && (
              <div className="os-section">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <p>Open <span>System Settings → Network</span>, select your active connection, click <span>Details → Proxies</span>.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <p>Enable both <span>Web Proxy (HTTP)</span> and <span>Secure Web Proxy (HTTPS)</span>.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <p>Set Server to <code>127.0.0.1</code> and Port to <code>{proxyPort || '8899'}</code> for both.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <p>Open <span>Keychain Access</span>, import the Bruno CA, and set it to <span>"Always Trust"</span>.</p>
                  </div>
                </div>
              </div>
            )}

            {activeOsTab === 'windows' && (
              <div className="os-section">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <p>Go to <span>Settings → Network & Internet → Proxy</span>.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <p>Enable <span>"Use a proxy server"</span> under Manual proxy setup.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <p>Address: <code>127.0.0.1</code>, Port: <code>{proxyPort || '8899'}</code>. Click Save.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <p>Double-click the CA file and install it into <span>"Trusted Root Certification Authorities"</span>.</p>
                  </div>
                </div>
              </div>
            )}

            {activeOsTab === 'linux' && (
              <div className="os-section">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <p>Set HTTP/HTTPS proxy to <code>127.0.0.1:{proxyPort || '8899'}</code> in your system settings.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <p>Some browsers (like Firefox) may need separate proxy configuration within their settings.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <p>Copy CA to <code>/usr/local/share/ca-certificates/</code> and run <code>sudo update-ca-certificates</code>.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="limitations">
              <div className="limitations-title">
                <IconInfoCircle size={14} />
                <span>Limitations & Notes</span>
              </div>
              <ul>
                <li>Safari and some apps only honor system proxy; you must configure it manually.</li>
                <li>Certificate pinning or custom HTTP stacks may bypass the proxy.</li>
                <li>Remember to revert your system proxy to avoid affecting other traffic.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </StyledWrapper>
  );
};

export default InterceptControls;
