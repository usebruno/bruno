const https = require('node:https');
const { execCommand, execCommandSilent, detectPlatform, getServerCertificateOptions } = require('./cert-helpers');

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

function createServer(certsDir, port = 8090) {
  const serverOptions = getServerCertificateOptions(certsDir);

  const server = https.createServer(serverOptions, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.end('ping');
  });

  return new Promise((resolve, reject) => {
    server.listen(port, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(server);
      }
    });
  });
}

function setupGracefulShutdown(server, cleanup) {
  const shutdown = (signal) => {
    console.log(`received ${signal}, shutting down`);
    
    if (cleanup) cleanup();
    
    if (server) {
      server.close(() => process.exit(0));
    } else {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = {
  killProcessOnPort,
  createServer,
  setupGracefulShutdown
};
