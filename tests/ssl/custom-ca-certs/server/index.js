#!/usr/bin/env node

const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const { killProcessOnPort } = require('./helpers/platform');

function createServer(certsDir, port = 8090) {
  const serverOptions =  {
    key: fs.readFileSync(path.join(certsDir, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(certsDir, 'localhost-cert.pem')),
    ca: fs.readFileSync(path.join(certsDir, 'ca-cert.pem'))
  }

  const server = https.createServer(serverOptions, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.end('helloworld');
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

function shutdownServer(server, cleanup) {
  const shutdown = (signal) => {
    console.log(`🛑 Received ${signal}, shutting down`);
    
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

async function startServer() {
  const certsDir = path.join(__dirname, 'certs');
  const port = 8090;

  console.log('🚀 Starting HTTPS test server');

  try {
    killProcessOnPort(port);

    console.log(`🌐 Creating server on port ${port}`);
    const server = await createServer(certsDir, port);
    
    shutdownServer(server, () => {
      console.log('✨ Server cleanup completed');
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };