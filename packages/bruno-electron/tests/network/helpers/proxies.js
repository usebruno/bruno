const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const brunoConfigFor = (port) => ({
  proxy: {
    disabled: false,
    inherit: false,
    config: {
      protocol: 'http',
      hostname: '127.0.0.1',
      port,
      auth: { disabled: true }
    }
  }
});

/**
 * A forwarding proxy pinned to one upstream socket, so a handshake that opens a second connection
 * cannot complete through it.
 */
const startForwardingProxy = async () => {
  const upstream = new http.Agent({ keepAlive: true, maxSockets: 1 });
  let connections = 0;

  const server = http.createServer((req, res) => {
    const target = new URL(req.url);
    const forwarded = http.request(
      {
        host: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: req.method,
        headers: req.headers,
        agent: upstream
      },
      (upstreamResponse) => {
        res.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
        upstreamResponse.pipe(res);
      }
    );

    forwarded.on('error', () => res.destroy());
    req.pipe(forwarded);
  });

  server.on('connection', () => {
    connections += 1;
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  return {
    port: server.address().port,
    brunoConfig: () => brunoConfigFor(server.address().port),
    connectionsAccepted: () => connections,
    close: () => new Promise((resolve) => server.close(resolve))
  };
};

const startConnectProxy = async () => {
  let tunnels = 0;
  const sockets = [];
  const server = http.createServer();

  server.on('connect', (req, clientSocket, head) => {
    tunnels += 1;
    sockets.push(clientSocket);
    const [host, port] = req.url.split(':');
    const upstream = net.connect(Number(port), host, () => {
      sockets.push(upstream);
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head && head.length) {
        upstream.write(head);
      }
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });

    upstream.on('error', () => clientSocket.destroy());
    clientSocket.on('error', () => upstream.destroy());
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  return {
    port: server.address().port,
    brunoConfig: () => brunoConfigFor(server.address().port),
    tunnelsOpened: () => tunnels,
    close: async () => {
      sockets.forEach((socket) => socket.destroy());
      await new Promise((resolve) => server.close(resolve));
    }
  };
};

const writePacFile = (proxyPort) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-ntlm-pac-'));
  const file = path.join(dir, 'proxy.pac');
  fs.writeFileSync(file, `function FindProxyForURL(url, host) { return 'PROXY 127.0.0.1:${proxyPort}'; }`);

  return {
    globalProxyConfig: { disabled: false, source: 'pac', pac: { source: pathToFileURL(file).href } },
    remove: () => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  };
};

module.exports = { startForwardingProxy, startConnectProxy, writePacFile };
