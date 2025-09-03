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

async function testServer(port = 8090) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(data.trim() === 'ping');
      });
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
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

async function waitForServer(port = 8090, maxAttempts = 10) {
  console.log(`checking server readiness on port ${port}`);
  
  for (let i = 1; i <= maxAttempts; i++) {
    console.log(`attempt ${i}/${maxAttempts}`);
    
    if (await testServer(port)) {
      console.log('server is responding');
      return true;
    }
    
    console.log('server not ready, waiting...');
    
    if (i < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`server failed to respond after ${maxAttempts} attempts`);
  return false;
}

module.exports = {
  killProcessOnPort,
  createServer,
  testServer,
  setupGracefulShutdown,
  waitForServer
};
