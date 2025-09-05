#!/usr/bin/env node

const path = require('node:path');
const {
  killProcessOnPort,
  createServer,
  setupGracefulShutdown
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