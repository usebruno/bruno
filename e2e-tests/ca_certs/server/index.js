#!/usr/bin/env node

const path = require('node:path');
const {
  killProcessOnPort,
  createServer,
  setupGracefulShutdown,
  waitForServer
} = require('./server-helpers');

/**
 * Start HTTPS test server
 */
async function startServer() {
  const certsDir = path.join(__dirname, 'certs');
  const port = 8090;

  console.log('starting HTTPS test server');

  try {
    killProcessOnPort(port);

    console.log(`creating server on port ${port}`);
    const server = await createServer(certsDir, port);
    
    console.log('waiting for server to become ready');
    const isReady = await waitForServer(port, 15);
    
    if (!isReady) {
      console.error(`server failed to become ready on port ${port}`);
      if (server) server.close();
      process.exit(1);
    }

    console.log(`server is ready on port ${port}`);
    
    setupGracefulShutdown(server, () => {
      console.log('server cleanup completed');
    });

  } catch (error) {
    console.error('server startup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };