const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { killProcessOnPort } = require('./helpers/platform');

/**
 * Creates an HTTP/HTTPS proxy server that can handle both regular HTTP requests
 * and HTTPS CONNECT tunneling for transparent proxying
 */
function createProxyServer(port = 8091) {
  // Main HTTP/HTTPS proxy server
  const proxy = http.createServer((req, res) => {
    try {
      // Handle both absolute URLs and relative paths
      let target;
      if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
        target = new URL(req.url);
      } else {
        // For relative URLs, construct from Host header
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host || 'localhost';
        target = new URL(`${protocol}://${host}${req.url}`);
      }

      console.log(`📡 Proxying ${req.method} ${target.href}`);

      const options = {
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname + target.search,
        method: req.method,
        headers: { ...req.headers },
        rejectUnauthorized: false, // Allow self-signed certificates
        servername: target.hostname // SNI support for localhost/self-signed
      };

      // Remove proxy-specific headers that shouldn't be forwarded
      delete options.headers['proxy-connection'];
      delete options.headers['proxy-authorization'];

      const proxyReq = (target.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
        // Forward response headers and status
        const responseHeaders = { ...proxyRes.headers };

        // Add proxy identification header
        responseHeaders['x-bruno-proxy'] = 'test-proxy-server';

        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error(`❌ Proxy request error for ${target.href}:`, err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
        }
        res.end(`Proxy error: ${err.message}`);
      });

      req.on('error', (err) => {
        console.error('❌ Client request error:', err.message);
      });

      res.on('error', (err) => {
        console.error('❌ Response error:', err.message);
      });

      // Forward request body
      req.pipe(proxyReq);
    } catch (err) {
      console.error('❌ Unexpected proxy error:', err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end(`Proxy internal error: ${err.message}`);
    }
  });

  // Handle HTTPS CONNECT tunneling for transparent HTTPS proxying
  proxy.on('connect', (req, clientSocket, head) => {
    try {
      const [host, port] = req.url.split(':');
      const targetPort = port || 443;

      console.log(`🔒 HTTPS CONNECT tunnel to ${host}:${targetPort}`);

      const serverSocket = net.connect(targetPort, host, () => {
        // Send successful connection response
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n'
          + 'Proxy-agent: Bruno-Test-Proxy\r\n'
          + '\r\n');

        // Forward any initial data
        if (head && head.length > 0) {
          serverSocket.write(head);
        }

        // Pipe data bidirectionally
        serverSocket.pipe(clientSocket, { end: false });
        clientSocket.pipe(serverSocket, { end: false });
      });

      const cleanup = () => {
        try {
          if (!clientSocket.destroyed) clientSocket.destroy();
          if (!serverSocket.destroyed) serverSocket.destroy();
        } catch (err) {
          // Ignore cleanup errors
        }
      };

      const handleError = (where, err) => {
        console.error(`❌ ${where} error in CONNECT tunnel:`, err.message);
        cleanup();
      };

      clientSocket.on('error', (err) => handleError('Client socket', err));
      serverSocket.on('error', (err) => handleError('Server socket', err));

      // Handle connection close
      clientSocket.on('close', cleanup);
      serverSocket.on('close', cleanup);
    } catch (err) {
      console.error('❌ CONNECT tunnel setup error:', err.message);
      try {
        clientSocket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        clientSocket.end();
      } catch (writeErr) {
        // Ignore write errors on cleanup
      }
    }
  });

  // Handle malformed requests
  proxy.on('clientError', (err, socket) => {
    console.error('❌ Client error:', err.message);
    try {
      if (socket.writable && !socket.destroyed) {
        socket.end('HTTP/1.1 400 Bad Request\r\n'
          + 'Content-Type: text/plain\r\n'
          + 'Connection: close\r\n'
          + '\r\n'
          + 'Bad Request');
      }
    } catch (writeErr) {
      // Ignore write errors on cleanup
    }
  });

  return new Promise((resolve, reject) => {
    proxy.listen(port, (error) => {
      if (error) {
        reject(error);
      } else {
        console.log(`🔄 Proxy server running on http://localhost:${port}`);
        resolve(proxy);
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

/**
 * Starts the proxy server with proper cleanup and error handling
 */
async function startProxyServer(port = 8091) {
  try {
    // Validate port number
    if (typeof port !== 'number' || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}. Must be between 1 and 65535.`);
    }

    // Kill any existing process on the port
    killProcessOnPort(port);

    console.log(`🚀 Starting proxy server on port ${port}`);
    const server = await createProxyServer(port);

    shutdownServer(server, () => {
      console.log('✨ Proxy server cleanup completed');
    });

    return server;
  } catch (error) {
    console.error('❌ Proxy server startup failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  startProxyServer();
}

module.exports = {
  createProxyServer,
  startProxyServer
};
