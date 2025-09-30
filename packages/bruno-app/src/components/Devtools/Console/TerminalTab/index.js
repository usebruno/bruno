import React, { useRef, useEffect, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { IconTerminal2 } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import '@xterm/xterm/css/xterm.css';

// Persistent terminal session state (module-level singleton)
let persistentSessionId = null;
let persistentStarted = false;
let sessionCreatePromise = null;

// Shared XTerm instance and resources
let sharedTerminal = null;
let sharedFitAddon = null;
let sharedInputDisposable = null;
let sharedResizeDisposable = null;

// Parking host for terminal DOM when view unmounts
let parkingHost = null;
let hasFlushedColdStart = false;

// If data arrives before terminal is created, buffer it once and flush on first open
let coldStartChunks = [];

const ensureParkingHost = () => {
  if (parkingHost && document.body.contains(parkingHost)) return parkingHost;
  parkingHost = document.createElement('div');
  parkingHost.style.display = 'none';
  parkingHost.setAttribute('data-terminal-parking-host', 'true');
  document.body.appendChild(parkingHost);
  return parkingHost;
};

const moveTerminalElementTo = (container) => {
  if (!sharedTerminal || !sharedTerminal.element || !container) return;
  if (sharedTerminal.element.parentElement !== container) {
    container.appendChild(sharedTerminal.element);
  }
};

const ensureTerminalSession = async () => {
  if (!window.ipcRenderer) {
    return null;
  }

  if (persistentStarted && persistentSessionId) {
    return persistentSessionId;
  }

  if (!sessionCreatePromise) {
    sessionCreatePromise = (async () => {
      const newSessionId = await window.ipcRenderer.invoke('terminal:create');
      if (!newSessionId) {
        return null;
      }

      persistentSessionId = newSessionId;
      persistentStarted = true;

      const onData = (data) => {
        if (!data) return;
        if (sharedTerminal) {
          try {
            sharedTerminal.write(data);
          } catch (err) {
            console.warn('Failed to write terminal data:', err);
          }
        } else {
          coldStartChunks.push(data);
        }
      };
      window.ipcRenderer.on(`terminal:data:${newSessionId}`, onData);

      const onExit = ({ exitCode, signal } = {}) => {
        const msg = `\r\n[Process exited with code ${exitCode ?? ''} ${signal ? `(signal ${signal})` : ''}]\r\n`;
        if (sharedTerminal) {
          try {
            sharedTerminal.write(msg);
          } catch (err) {
            console.warn('Failed to write terminal exit message:', err);
          }
        } else {
          coldStartChunks.push(msg);
        }
      };
      window.ipcRenderer.on(`terminal:exit:${newSessionId}`, onExit);

      return newSessionId;
    })();
  }

  return sessionCreatePromise;
};

const createSharedTerminalIfNeeded = () => {
  if (sharedTerminal) return;

  sharedTerminal = new Terminal({
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

  sharedFitAddon = new FitAddon();
  sharedTerminal.loadAddon(sharedFitAddon);
};

const openSharedTerminalInto = async (container) => {
  if (!container) return;
  createSharedTerminalIfNeeded();

  if (!sharedTerminal.element) {
    sharedTerminal.open(container);

    if (!hasFlushedColdStart && coldStartChunks.length > 0) {
      try {
        for (const chunk of coldStartChunks) {
          sharedTerminal.write(chunk);
        }
      } catch (err) {
        console.warn('Failed to flush cold-start chunks:', err);
      } finally {
        coldStartChunks = [];
        hasFlushedColdStart = true;
      }
    }
  } else {
    moveTerminalElementTo(container);
  }

  await new Promise((resolve) => setTimeout(resolve, 50));
  try {
    sharedFitAddon.fit();
  } catch (e) {}
};

const TerminalTab = () => {
  const terminalRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      try {
        if (!terminalRef.current) return;

        const sid = await ensureTerminalSession();

        await openSharedTerminalInto(terminalRef.current);

        if (!isMounted) return;
        setIsConnected(!!sid);

        if (!sharedInputDisposable) {
          sharedInputDisposable = sharedTerminal.onData((data) => {
            if (data && persistentSessionId) {
              window.ipcRenderer?.send('terminal:input', persistentSessionId, data);
            }
          });
        }

        if (!sharedResizeDisposable) {
          sharedResizeDisposable = sharedTerminal.onResize(({ cols, rows }) => {
            if (persistentSessionId) {
              window.ipcRenderer?.send('terminal:resize', persistentSessionId, { cols, rows });
            }
          });
        }

        setTimeout(() => {
          try {
            if (!persistentSessionId) return;
            sharedFitAddon.fit();
            const { cols, rows } = sharedTerminal;
            if (cols && rows) {
              window.ipcRenderer?.send('terminal:resize', persistentSessionId, { cols, rows });
            }
          } catch (err) {
            console.warn('Failed to perform initial resize:', err);
          }
        }, 100);

        const onWindowResize = () => {
          try {
            sharedFitAddon.fit();
          } catch (e) {}
        };
        window.addEventListener('resize', onWindowResize);

        return () => {
          window.removeEventListener('resize', onWindowResize);

          if (sharedTerminal && sharedTerminal.element) {
            const host = ensureParkingHost();
            moveTerminalElementTo(host);
          }
        };
      } catch (err) {
        console.error('Failed to initialize terminal view:', err);
      }
    };

    const cleanup = setup();

    return () => {
      isMounted = false;
      Promise.resolve(cleanup).then((fn) => {
        if (typeof fn === 'function') fn();
      });
    };
  }, []);

  return (
    <StyledWrapper>
      <div className="terminal-content">
        {!isConnected && window.ipcRenderer && (
          <div className="terminal-loading">
            <IconTerminal2 size={24} strokeWidth={1.5} />
            <span>Connecting to terminal...</span>
          </div>
        )}
        <div
          ref={terminalRef}
          className="terminal-container"
          style={{
            height: '100%',
            width: '100%',
            display: isConnected || !window.ipcRenderer ? 'block' : 'none'
          }}
        />
      </div>
    </StyledWrapper>
  );
};

export default TerminalTab;
