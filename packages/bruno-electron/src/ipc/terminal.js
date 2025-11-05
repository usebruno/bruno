const { ipcMain } = require('electron');
const pty = require('@lydell/node-pty');
const os = require('os');
const path = require('path');
const isDev = require('electron-is-dev');

class TerminalManager {
  constructor() {
    this.terminals = new Map();
    this.setupIpcHandlers();
  }

  setupIpcHandlers() {
    // Create a new terminal session
    ipcMain.handle('terminal:create', (event, options = {}) => {
      try {
        const sessionId = this.generateSessionId();
        const shell = this.getDefaultShell();
        // Use provided cwd or default to home directory
        const cwd = options.cwd || this.getDefaultCwd();

        if (isDev) {
          console.log(`Creating new terminal session: ${sessionId} at ${cwd}`);
        }

        const ptyProcess = pty.spawn(shell, [], {
          name: 'xterm-color',
          cols: 80,
          rows: 24,
          cwd: cwd,
          env: process.env
        });

        // Store terminal session
        this.terminals.set(sessionId, {
          pty: ptyProcess,
          webContents: event.sender,
          cwd: cwd // Store initial cwd
        });

        // Handle terminal output
        ptyProcess.onData((data) => {
          try {
            if (data && event.sender && !event.sender.isDestroyed()) {
              event.sender.send(`terminal:data:${sessionId}`, data);
            }
          } catch (error) {
            console.warn('Failed to send terminal data:', error);
          }
        });

        // Handle terminal exit
        ptyProcess.onExit(({ exitCode, signal }) => {
          try {
            this.terminals.delete(sessionId);
            if (event.sender && !event.sender.isDestroyed()) {
              event.sender.send(`terminal:exit:${sessionId}`, { exitCode, signal });
            }
          } catch (error) {
            console.warn('Failed to handle terminal exit:', error);
          }
        });

        return sessionId;
      } catch (error) {
        console.error('Failed to create terminal session:', error);
        return null;
      }
    });

    // Send input to terminal
    ipcMain.on('terminal:input', (event, sessionId, data) => {
      try {
        const terminal = this.terminals.get(sessionId);
        if (terminal && terminal.pty && data) {
          terminal.pty.write(data);
        }
      } catch (error) {
        console.warn('Failed to send input to terminal:', error);
      }
    });

    // Resize terminal
    ipcMain.on('terminal:resize', (event, sessionId, { cols, rows }) => {
      try {
        const terminal = this.terminals.get(sessionId);
        if (terminal && terminal.pty && cols > 0 && rows > 0) {
          terminal.pty.resize(cols, rows);
        }
      } catch (error) {
        console.warn('Failed to resize terminal:', error);
      }
    });

    // Kill terminal session
    ipcMain.on('terminal:kill', (event, sessionId) => {
      const terminal = this.terminals.get(sessionId);
      if (terminal && terminal.pty) {
        try {
          terminal.pty.kill();
          this.terminals.delete(sessionId);
        } catch (error) {
          console.error('Failed to kill terminal:', error);
        }
      }
    });

    // Get list of all active terminal sessions
    ipcMain.handle('terminal:list-sessions', (event) => {
      try {
        const sessions = [];
        for (const [sessionId, terminal] of this.terminals.entries()) {
          if (terminal && terminal.pty) {
            // Check if process is still alive
            try {
              const pid = terminal.pty.pid;
              process.kill(pid, 0); // Signal 0 just checks if process exists
              sessions.push({
                sessionId,
                cwd: terminal.cwd || '', // Use stored cwd
                pid: pid
              });
            } catch (error) {
              // Process doesn't exist, remove it
              this.terminals.delete(sessionId);
            }
          }
        }
        return sessions;
      } catch (error) {
        console.error('Failed to list terminal sessions:', error);
        return [];
      }
    });
  }

  getDefaultShell() {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    } else {
      return process.env.SHELL || '/bin/bash';
    }
  }

  getDefaultCwd() {
    // Try to use user's home directory as default
    return process.env.HOME || process.env.USERPROFILE || os.homedir();
  }

  generateSessionId() {
    return `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up terminals when window closes
  cleanup(webContents) {
    for (const [sessionId, terminal] of this.terminals.entries()) {
      if (terminal.webContents === webContents) {
        try {
          terminal.pty.kill();
          this.terminals.delete(sessionId);
        } catch (error) {
          console.error('Failed to cleanup terminal:', error);
        }
      }
    }
  }

  // Kill all terminals
  killAll() {
    for (const [sessionId, terminal] of this.terminals.entries()) {
      try {
        terminal.pty.kill();
      } catch (error) {
        console.error('Failed to kill terminal:', error);
      }
    }
    this.terminals.clear();
  }
}

module.exports = TerminalManager;
