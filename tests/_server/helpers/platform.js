const { execSync } = require('node:child_process');
const os = require('node:os');

function execCommand(command, cwd = process.cwd()) {
  return execSync(command, { 
    cwd, 
    stdio: 'inherit',
    timeout: 30000 
  });
}

function execCommandSilent(command, cwd = process.cwd()) {
  return execSync(command, { 
    cwd, 
    stdio: 'pipe',
    timeout: 30000 
  });
}

function detectPlatform() {
  const platform = os.platform();
  switch (platform) {
    case 'darwin': return 'macos';
    case 'linux': return 'linux';
    case 'win32': return 'windows';
    default: throw new Error(`Unsupported platform: ${platform}`);
  }
}

function killProcessOnPort(port) {
  const platform = detectPlatform();
  
  try {
    switch (platform) {
      case 'macos':
        execCommand(`lsof -ti :${port} | xargs kill -9`);
        break;
      case 'linux':
        execCommand(`lsof -ti :${port} | xargs kill -9`);
        break;
      case 'windows':
        const result = execCommandSilent(`netstat -ano | findstr :${port}`);
        const lines = result.toString().split('\n');
        for (const line of lines) {
          const match = line.trim().match(/\s+(\d+)$/);
          if (match) {
            execCommandSilent(`taskkill /F /PID ${match[1]}`);
          }
        }
        break;
    }
  } catch (error) {}
}

module.exports = {
  execCommand,
  execCommandSilent,
  detectPlatform,
  killProcessOnPort
};