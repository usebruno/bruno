import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { IconTerminal2, IconPlus } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import SessionList from './SessionList';
import '@xterm/xterm/css/xterm.css';

// Terminal instances per session - Map<sessionId, { terminal, fitAddon, inputDisposable, resizeDisposable }>
const terminalInstances = new Map();

// Data listeners per session - Map<sessionId, { onData, onExit }>
const sessionListeners = new Map();

// Parking host for terminal DOM when view unmounts
let parkingHost = null;

// Export function to get current session ID (for backward compatibility)
export const getSessionId = () => {
  // Return the first active session ID if any
  if (terminalInstances.size > 0) {
    return Array.from(terminalInstances.keys())[0];
  }
  return null;
};

const ensureParkingHost = () => {
  if (parkingHost && document.body.contains(parkingHost)) return parkingHost;
  parkingHost = document.createElement('div');
  parkingHost.style.display = 'none';
  parkingHost.setAttribute('data-terminal-parking-host', 'true');
  document.body.appendChild(parkingHost);
  return parkingHost;
};

const createTerminalForSession = (sessionId) => {
  if (terminalInstances.has(sessionId)) {
    return terminalInstances.get(sessionId);
  }

  const terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selection: '#264f78',
      black: '#1e1e1e',
      red: '#f14c4c',
      green: '#23d18b',
      yellow: '#f5f543',
      blue: '#3b8eea',
      magenta: '#d670d6',
      cyan: '#29b8db',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    allowProposedApi: true
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  const inputDisposable = terminal.onData((data) => {
    if (data && sessionId && window.ipcRenderer) {
      window.ipcRenderer.send('terminal:input', sessionId, data);
    }
  });

  const resizeDisposable = terminal.onResize(({ cols, rows }) => {
    if (sessionId && window.ipcRenderer) {
      window.ipcRenderer.send('terminal:resize', sessionId, { cols, rows });
    }
  });

  const instance = {
    terminal,
    fitAddon,
    inputDisposable,
    resizeDisposable
  };

  terminalInstances.set(sessionId, instance);

  // Setup IPC listeners for this session
  if (window.ipcRenderer && !sessionListeners.has(sessionId)) {
    const onData = (data) => {
      if (!data) return;
      const instance = terminalInstances.get(sessionId);
      if (instance && instance.terminal) {
        try {
          instance.terminal.write(data);
        } catch (err) {
          console.warn('Failed to write terminal data:', err);
        }
      }
    };

    const onExit = ({ exitCode, signal } = {}) => {
      const msg = `\r\n[Process exited with code ${exitCode ?? ''} ${signal ? `(signal ${signal})` : ''}]\r\n`;
      const instance = terminalInstances.get(sessionId);
      if (instance && instance.terminal) {
        try {
          instance.terminal.write(msg);
        } catch (err) {
          console.warn('Failed to write terminal exit message:', err);
        }
      }
      // Cleanup on exit
      cleanupTerminalInstance(sessionId);
    };

    window.ipcRenderer.on(`terminal:data:${sessionId}`, onData);
    window.ipcRenderer.on(`terminal:exit:${sessionId}`, onExit);

    sessionListeners.set(sessionId, { onData, onExit });
  }

  return instance;
};

const cleanupTerminalInstance = (sessionId) => {
  const instance = terminalInstances.get(sessionId);
  if (instance) {
    try {
      if (instance.inputDisposable) instance.inputDisposable.dispose();
      if (instance.resizeDisposable) instance.resizeDisposable.dispose();
      if (instance.terminal) {
        instance.terminal.dispose();
      }
    } catch (err) {
      console.warn('Error disposing terminal instance:', err);
    }
    terminalInstances.delete(sessionId);
  }

  // Remove IPC listeners
  const listeners = sessionListeners.get(sessionId);
  if (listeners && window.ipcRenderer) {
    try {
      window.ipcRenderer.removeAllListeners(`terminal:data:${sessionId}`);
      window.ipcRenderer.removeAllListeners(`terminal:exit:${sessionId}`);
    } catch (err) {
      console.warn('Error removing IPC listeners:', err);
    }
    sessionListeners.delete(sessionId);
  }
};

const openTerminalIntoContainer = async (container, sessionId) => {
  if (!container || !sessionId) return;

  const instance = createTerminalForSession(sessionId);
  const { terminal, fitAddon } = instance;

  if (!terminal.element) {
    terminal.open(container);
  } else {
    // Move terminal element to new container
    if (terminal.element.parentElement !== container) {
      container.appendChild(terminal.element);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 50));
  try {
    fitAddon.fit();
    terminal.focus();
    const { cols, rows } = terminal;
    if (cols && rows && window.ipcRenderer) {
      window.ipcRenderer.send('terminal:resize', sessionId, { cols, rows });
    }
  } catch (e) {
    console.warn('Error fitting terminal:', e);
  }
};

let fitFrameRef;
const fitTerminal = (activeSessionId, container) => {
  if (!container) return;

  const instance = terminalInstances.get(activeSessionId);
  if (!instance?.fitAddon) return;

  if (fitFrameRef) {
    cancelAnimationFrame(fitFrameRef);
  }

  fitFrameRef = requestAnimationFrame(() => {
    fitFrameRef = null;

    // Avoid fitting when hidden/0-sized (common during tab switches/layout transitions)
    if (container.offsetWidth === 0 || container.offsetHeight === 0) return;

    try {
      instance.fitAddon.fit();
    } catch (e) {}
  });
};

const TerminalTab = () => {
  const terminalRef = useRef(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load sessions list
  const loadSessions = useCallback(async (currentActiveSessionId = null) => {
    if (!window.ipcRenderer) return [];

    try {
      const sessionList = await window.ipcRenderer.invoke('terminal:list-sessions');
      setSessions(sessionList);

      // Use functional state updates to get the current activeSessionId
      setActiveSessionId((prevActiveSessionId) => {
        const activeId = currentActiveSessionId !== null ? currentActiveSessionId : prevActiveSessionId;

        // Auto-select first session if none selected
        if (!activeId && sessionList.length > 0) {
          return sessionList[0].sessionId;
        }

        // If active session no longer exists, select first available
        if (activeId && !sessionList.find((s) => s.sessionId === activeId)) {
          return sessionList.length > 0 ? sessionList[0].sessionId : null;
        }

        // Keep current selection if it still exists
        return activeId;
      });

      return sessionList;
    } catch (err) {
      console.error('Failed to load sessions:', err);
      return [];
    }
  }, []);

  // Create new terminal session
  const createNewSession = useCallback(
    async (cwd = null) => {
      if (!window.ipcRenderer) return null;

      try {
        const options = cwd ? { cwd } : {};
        const newSessionId = await window.ipcRenderer.invoke('terminal:create', options);
        if (newSessionId) {
          await loadSessions(newSessionId);
          setActiveSessionId(newSessionId);
          return newSessionId;
        }
      } catch (err) {
        console.error('Failed to create terminal session:', err);
      }
      return null;
    },
    [loadSessions]
  );

  // Listen for requests to open terminal at specific CWD
  useEffect(() => {
    const normalizePath = (path) => {
      if (!path) return '';
      // Normalize path separators and remove trailing separators for comparison
      return path.replace(/\\/g, '/').replace(/\/$/, '') || '/';
    };

    const handleOpenTerminalAtCwd = async (event) => {
      const { cwd } = event.detail;
      if (!cwd) return;

      const normalizedCwd = normalizePath(cwd);

      // Check if session already exists at this CWD
      const sessionList = await window.ipcRenderer.invoke('terminal:list-sessions');
      const existingSession = sessionList.find((s) => normalizePath(s.cwd) === normalizedCwd);

      if (existingSession) {
        // Switch to existing session
        await loadSessions(existingSession.sessionId);
        setActiveSessionId(existingSession.sessionId);
      } else {
        // Create new session at this CWD
        await createNewSession(cwd);
      }
    };

    window.addEventListener('terminal:open-at-cwd', handleOpenTerminalAtCwd);

    return () => {
      window.removeEventListener('terminal:open-at-cwd', handleOpenTerminalAtCwd);
    };
  }, [loadSessions, createNewSession]);

  // Close terminal session
  const closeSession = async (sessionId) => {
    if (!window.ipcRenderer) return;

    try {
      window.ipcRenderer.send('terminal:kill', sessionId);
      cleanupTerminalInstance(sessionId);

      // Load updated sessions (this will also handle active session switching)
      const updatedSessions = await loadSessions();

      // If we closed the active session and there are no sessions left, clear selection
      if (activeSessionId === sessionId && updatedSessions.length === 0) {
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error('Failed to close terminal session:', err);
    }
  };

  // Load sessions on mount and set up polling
  useEffect(() => {
    if (!window.ipcRenderer) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const initialLoad = async () => {
      const sessionList = await loadSessions();
      if (mounted) {
        setIsLoading(false);
      }
    };

    initialLoad();

    // Poll for session updates every 2 seconds
    // Note: We don't pass currentActiveSessionId here to avoid stale closures
    // The functional update inside loadSessions will use the current state
    const pollInterval = setInterval(() => {
      if (mounted) {
        loadSessions();
      }
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Handle terminal display for active session
  useEffect(() => {
    if (!activeSessionId || !terminalRef.current) return;

    let mounted = true;

    const setupTerminal = async () => {
      await openTerminalIntoContainer(terminalRef.current, activeSessionId);

      if (mounted) {
        const instance = terminalInstances.get(activeSessionId);
        if (instance) {
          try {
            const { cols, rows } = instance.terminal;
            if (cols && rows && window.ipcRenderer) {
              window.ipcRenderer.send('terminal:resize', activeSessionId, { cols, rows });
            }
          } catch (err) {
            console.warn('Failed to perform initial resize:', err);
          }

          return () => {
            // Park terminal element when switching sessions
            if (instance.terminal && instance.terminal.element) {
              const host = ensureParkingHost();
              if (instance.terminal.element.parentElement !== host) {
                host.appendChild(instance.terminal.element);
              }
            }
          };
        }
      }
    };

    const cleanup = setupTerminal();

    return () => {
      mounted = false;
      Promise.resolve(cleanup).then((fn) => {
        if (typeof fn === 'function') fn();
      });
    };
  }, [activeSessionId]);

  const onSessionMount = useCallback(
    (node) => {
      if (!node) return;
      terminalRef.current = node;
      fitTerminal(activeSessionId, node);
      const ro = new ResizeObserver(() => fitTerminal(activeSessionId, node));
      ro.observe(node.parentNode);
      return () => ro.disconnect();
    },
    [activeSessionId]
  );

  return (
    <StyledWrapper>
      <div className="terminal-content">
        {/* Left Sidebar */}
        <div className="terminal-sessions-sidebar">
          <div className="terminal-sessions-header">
            <span>Sessions</span>
            <IconPlus
              size={16}
              style={{ cursor: 'pointer', color: '#888' }}
              onClick={(e) => {
                e.stopPropagation();
                createNewSession();
              }}
              title="New Terminal Session"
            />
          </div>
          <div className="terminal-sessions-list">
            {isLoading ? (
              <div style={{ padding: '12px', color: '#888', fontSize: '13px' }}>Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '12px', color: '#888', fontSize: '13px' }}>No active sessions</div>
            ) : (
              <SessionList
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={setActiveSessionId}
                onCloseSession={closeSession}
              />
            )}
          </div>
        </div>

        {/* Right Terminal Display */}
        <div className="terminal-display-container">
          {!activeSessionId && window.ipcRenderer && (
            <div className="terminal-loading">
              <IconTerminal2 size={24} strokeWidth={1.5} />
              <span>No terminal session selected</span>
            </div>
          )}
          <div
            ref={onSessionMount}
            className="terminal-container"
            style={{
              height: '100%',
              width: '100%',
              display: activeSessionId ? 'block' : 'none'
            }}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default TerminalTab;
