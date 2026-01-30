#!/usr/bin/env node

const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const WebSocket = require('ws');
const { killProcessOnPort } = require('./helpers/platform');

function createServer(certsDir, port = 8090) {
  const serverOptions = {
    key: fs.readFileSync(path.join(certsDir, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(certsDir, 'localhost-cert.pem')),
    ca: fs.readFileSync(path.join(certsDir, 'ca-cert.pem'))
  };

  const server = https.createServer(serverOptions, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.end('helloworld');
  });

  // Create WebSocket server for WSS support
  const wss = new WebSocket.Server({ noServer: true });

  wss.on('connection', function connection(ws, request) {
    ws.on('error', function error(err) {
      console.error('WebSocket error:', err.message);
    });

    ws.on('message', function message(data) {
      const msg = Buffer.from(data).toString().trim();
      let isJSON = false;
      let obj = {};
      try {
        obj = JSON.parse(msg);
        isJSON = true;
      } catch (err) {
        // Not a JSON value
      }
      if (isJSON) {
        if ('func' in obj && obj.func === 'headers') {
          return ws.send(JSON.stringify({
            headers: request.headers
          }));
        } else if ('func' in obj && obj.func === 'query') {
          const url = new URL(request.url, `https://${request.headers.host}`);
          const query = Object.fromEntries(url.searchParams.entries());
          return ws.send(JSON.stringify({
            query: query
          }));
        } else {
          return ws.send(JSON.stringify({
            data: obj
          }));
        }
      }
      return ws.send(Buffer.from(data).toString());
    });
  });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (request, socket, head) => {
    if (request.url.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
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
