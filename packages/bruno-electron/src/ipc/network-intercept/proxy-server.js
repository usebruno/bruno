const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');
const zlib = require('zlib');
const fzstd = require('fzstd');
const { EventEmitter } = require('events');
const { getCAManager } = require('./ca-manager');

const DEFAULT_PORT = 8899;

class ProxyServer extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.port = DEFAULT_PORT;
    this.isRunning = false;
    this.caManager = null;
    this.requestCounter = 0;
  }

  /**
   * Start the proxy server
   * @param {number} port - Port to listen on
   * @returns {Promise<{port: number}>}
   */
  async start(port = DEFAULT_PORT) {
    if (this.isRunning) {
      return { port: this.port };
    }

    this.port = port;
    this.caManager = getCAManager();
    await this.caManager.initialize();

    return new Promise((resolve, reject) => {
      this.server = http.createServer();

      // Handle regular HTTP requests
      this.server.on('request', (req, res) => {
        this.handleHttpRequest(req, res);
      });

      // Handle CONNECT method for HTTPS tunneling
      this.server.on('connect', (req, clientSocket, head) => {
        this.handleConnectRequest(req, clientSocket, head);
      });

      this.server.on('error', (err) => {
        console.error('Proxy server error:', err);
        if (err.code === 'EADDRINUSE') {
          // Try next port
          this.port++;
          this.server.listen(this.port, '127.0.0.1');
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        this.isRunning = true;
        console.log(`Bruno proxy server listening on 127.0.0.1:${this.port}`);
        resolve({ port: this.port });
      });
    });
  }

  /**
   * Stop the proxy server
   */
  async stop() {
    if (!this.isRunning || !this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        this.server = null;
        console.log('Bruno proxy server stopped');
        resolve();
      });
    });
  }

  /**
   * Handle HTTP requests (non-HTTPS)
   */
  handleHttpRequest(clientReq, clientRes) {
    const requestId = ++this.requestCounter;
    const startTime = Date.now();
    const parsedUrl = url.parse(clientReq.url);

    console.log(`[Intercept] HTTP request: ${clientReq.method} ${clientReq.url}`);

    const interceptedRequest = {
      id: requestId,
      timestamp: new Date().toISOString(),
      method: clientReq.method,
      url: clientReq.url,
      protocol: 'http',
      host: parsedUrl.hostname,
      path: parsedUrl.path,
      headers: { ...clientReq.headers },
      source: this.detectSource(clientReq.headers)
    };

    // Collect request body
    const requestBodyChunks = [];
    clientReq.on('data', (chunk) => {
      requestBodyChunks.push(chunk);
    });

    clientReq.on('end', () => {
      interceptedRequest.requestBody = Buffer.concat(requestBodyChunks).toString('utf8');

      // Emit request event
      this.emit('request', interceptedRequest);

      // Forward the request
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.path,
        method: clientReq.method,
        headers: clientReq.headers
      };

      const proxyReq = http.request(options, (proxyRes) => {
        const responseBodyChunks = [];

        proxyRes.on('data', (chunk) => {
          responseBodyChunks.push(chunk);
        });

        proxyRes.on('end', () => {
          const duration = Date.now() - startTime;
          const responseBody = Buffer.concat(responseBodyChunks);

          const interceptedResponse = {
            id: requestId,
            statusCode: proxyRes.statusCode,
            statusMessage: proxyRes.statusMessage,
            headers: { ...proxyRes.headers },
            body: this.parseResponseBody(
              responseBody,
              proxyRes.headers['content-type'],
              proxyRes.headers['content-encoding']
            ),
            size: responseBody.length,
            duration
          };

          // Emit response event
          this.emit('response', { request: interceptedRequest, response: interceptedResponse });

          // Send response to client
          clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
          clientRes.end(responseBody);
        });
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy request error:', err);
        this.emit('error', { requestId, error: err.message });
        clientRes.writeHead(502);
        clientRes.end('Proxy Error');
      });

      if (requestBodyChunks.length > 0) {
        proxyReq.write(Buffer.concat(requestBodyChunks));
      }
      proxyReq.end();
    });
  }

  /**
   * Handle CONNECT requests for HTTPS tunneling with MITM
   */
  handleConnectRequest(req, clientSocket, head) {
    const [hostname, port] = req.url.split(':');
    const targetPort = parseInt(port, 10) || 443;
    const requestId = ++this.requestCounter;

    console.log(`[Intercept] CONNECT request: ${hostname}:${targetPort}`);

    // Generate certificate for this domain
    const domainCert = this.caManager.generateDomainCert(hostname);

    // Create a fake HTTPS server for this connection
    const fakeServer = https.createServer({
      key: domainCert.key,
      cert: domainCert.cert
    });

    fakeServer.on('request', (fakeReq, fakeRes) => {
      this.handleHttpsRequest(fakeReq, fakeRes, hostname, targetPort, requestId);
    });

    // Start the fake server on a random port
    fakeServer.listen(0, '127.0.0.1', () => {
      const fakePort = fakeServer.address().port;

      // Tell client the tunnel is established
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

      // Connect client to our fake server
      const fakeSocket = net.connect(fakePort, '127.0.0.1', () => {
        fakeSocket.write(head);
        clientSocket.pipe(fakeSocket);
        fakeSocket.pipe(clientSocket);
      });

      fakeSocket.on('error', (err) => {
        console.error('Fake socket error:', err);
        clientSocket.destroy();
      });

      clientSocket.on('error', (err) => {
        console.error('Client socket error:', err);
        fakeSocket.destroy();
      });

      clientSocket.on('close', () => {
        fakeServer.close();
      });
    });

    fakeServer.on('error', (err) => {
      console.error('Fake server error:', err);
      clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      clientSocket.destroy();
    });
  }

  /**
   * Detect the source of the request based on User-Agent
   */
  detectSource(headers) {
    const userAgent = headers['user-agent'] || '';
    const lowerUA = userAgent.toLowerCase();

    if (lowerUA.includes('curl')) return 'curl';
    if (lowerUA.includes('wget')) return 'wget';
    if (lowerUA.includes('httpie')) return 'httpie';
    if (lowerUA.includes('postman')) return 'postman';
    if (lowerUA.includes('insomnia')) return 'insomnia';
    if (lowerUA.includes('node')) return 'node';
    if (lowerUA.includes('python')) return 'python';
    if (lowerUA.includes('go-http-client')) return 'go';
    if (lowerUA.includes('java')) return 'java';
    if (lowerUA.includes('chrome') || lowerUA.includes('chromium')) return 'browser';
    if (lowerUA.includes('firefox')) return 'browser';
    if (lowerUA.includes('safari')) return 'browser';
    if (lowerUA.includes('edge')) return 'browser';

    return 'terminal';
  }

  /**
   * Handle decrypted HTTPS requests
   */
  handleHttpsRequest(clientReq, clientRes, hostname, targetPort, baseRequestId) {
    const requestId = ++this.requestCounter;
    const startTime = Date.now();
    const fullUrl = `https://${hostname}${targetPort !== 443 ? ':' + targetPort : ''}${clientReq.url}`;

    console.log(`[Intercept] HTTPS request: ${clientReq.method} ${fullUrl}`);

    const interceptedRequest = {
      id: requestId,
      timestamp: new Date().toISOString(),
      method: clientReq.method,
      url: fullUrl,
      protocol: 'https',
      host: hostname,
      path: clientReq.url,
      headers: { ...clientReq.headers },
      source: this.detectSource(clientReq.headers)
    };

    // Collect request body
    const requestBodyChunks = [];
    clientReq.on('data', (chunk) => {
      requestBodyChunks.push(chunk);
    });

    clientReq.on('end', () => {
      interceptedRequest.requestBody = Buffer.concat(requestBodyChunks).toString('utf8');

      // Emit request event
      this.emit('request', interceptedRequest);

      // Forward the request to the real server
      const options = {
        hostname: hostname,
        port: targetPort,
        path: clientReq.url,
        method: clientReq.method,
        headers: {
          ...clientReq.headers,
          host: hostname
        },
        rejectUnauthorized: false // Accept self-signed certs on target
      };

      const proxyReq = https.request(options, (proxyRes) => {
        const responseBodyChunks = [];

        proxyRes.on('data', (chunk) => {
          responseBodyChunks.push(chunk);
        });

        proxyRes.on('end', () => {
          const duration = Date.now() - startTime;
          const responseBody = Buffer.concat(responseBodyChunks);

          const interceptedResponse = {
            id: requestId,
            statusCode: proxyRes.statusCode,
            statusMessage: proxyRes.statusMessage,
            headers: { ...proxyRes.headers },
            body: this.parseResponseBody(
              responseBody,
              proxyRes.headers['content-type'],
              proxyRes.headers['content-encoding']
            ),
            size: responseBody.length,
            duration
          };

          // Emit response event
          this.emit('response', { request: interceptedRequest, response: interceptedResponse });

          // Send response to client
          clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
          clientRes.end(responseBody);
        });
      });

      proxyReq.on('error', (err) => {
        console.error('HTTPS proxy request error:', err);
        this.emit('error', { requestId, error: err.message });
        clientRes.writeHead(502);
        clientRes.end('Proxy Error');
      });

      if (requestBodyChunks.length > 0) {
        proxyReq.write(Buffer.concat(requestBodyChunks));
      }
      proxyReq.end();
    });
  }

  /**
   * Decompress response body if needed
   * @param {Buffer} buffer - The response body buffer
   * @param {string} contentEncoding - The content-encoding header value
   * @returns {Buffer} - Decompressed buffer
   */
  decompressBody(buffer, contentEncoding) {
    if (!contentEncoding || !buffer || buffer.length === 0) {
      return buffer;
    }

    console.log('Decompressing response with encoding:', contentEncoding, 'buffer length:', buffer.length);

    try {
      const encoding = contentEncoding.toLowerCase();
      if (encoding.includes('gzip')) {
        console.log('Using gunzip');
        return zlib.gunzipSync(buffer);
      } else if (encoding.includes('deflate')) {
        console.log('Using inflate');
        return zlib.inflateSync(buffer);
      } else if (encoding.includes('br')) {
        console.log('Using brotli');
        return zlib.brotliDecompressSync(buffer);
      } else if (encoding.includes('zstd')) {
        console.log('Using zstd');
        // fzstd.decompress returns Uint8Array, convert to Buffer
        const decompressed = fzstd.decompress(buffer);
        return Buffer.from(decompressed);
      }
      console.log('Unknown encoding, returning original buffer');
    } catch (err) {
      console.error('Failed to decompress response body:', err.message);
      // Return original buffer if decompression fails
    }
    return buffer;
  }

  /**
   * Parse response body based on content type
   * @param {Buffer} buffer - The response body buffer (possibly compressed)
   * @param {string} contentType - The content-type header value
   * @param {string} contentEncoding - The content-encoding header value
   * @returns {string|Object} - Parsed body content
   */
  parseResponseBody(buffer, contentType, contentEncoding) {
    if (!buffer || buffer.length === 0) {
      return '';
    }

    // Decompress if needed
    const decompressedBuffer = this.decompressBody(buffer, contentEncoding);

    if (!contentType) {
      return decompressedBuffer.toString('utf8');
    }

    // For binary content, return base64
    if (
      contentType.includes('image/')
      || contentType.includes('audio/')
      || contentType.includes('video/')
      || contentType.includes('application/octet-stream')
      || contentType.includes('application/pdf')
      || contentType.includes('application/zip')
    ) {
      return {
        type: 'binary',
        encoding: 'base64',
        data: decompressedBuffer.toString('base64'),
        mimeType: contentType
      };
    }

    // For text-based content, return as string
    try {
      return decompressedBuffer.toString('utf8');
    } catch (err) {
      console.error('Failed to decode response body as UTF-8:', err.message);
      return decompressedBuffer.toString('latin1');
    }
  }

  /**
   * Get current proxy status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      requestCount: this.requestCounter
    };
  }

  /**
   * Get the proxy port
   */
  getPort() {
    return this.port;
  }
}

// Singleton instance
let proxyServerInstance = null;

const getProxyServer = () => {
  if (!proxyServerInstance) {
    proxyServerInstance = new ProxyServer();
  }
  return proxyServerInstance;
};

module.exports = {
  ProxyServer,
  getProxyServer,
  DEFAULT_PORT
};
