const http = require('node:http');
const net = require('node:net');

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

// Served over http rather than written to disk, the way tests/proxy/pac does it.
const servePacFileFor = async (proxyPort) => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/x-ns-proxy-autoconfig' });
    res.end(`function FindProxyForURL(url, host) { return 'PROXY 127.0.0.1:${proxyPort}'; }`);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  return {
    globalProxyConfig: {
      disabled: false,
      source: 'pac',
      pac: { source: `http://127.0.0.1:${server.address().port}/proxy.pac` }
    },
    close: () => new Promise((resolve) => server.close(resolve))
  };
};

const startProxyForHttp = async () => {
  // Kept alive because the endpoint binds authentication to the connection it arrives on.
  const upstreamAgent = new http.Agent({ keepAlive: true });
  let clientConnections = 0;

  const server = http.createServer((clientRequest, clientResponse) => {
    const target = new URL(clientRequest.url);
    const upstreamRequest = http.request(
      {
        host: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: clientRequest.method,
        headers: clientRequest.headers,
        agent: upstreamAgent
      },
      (upstreamResponse) => {
        clientResponse.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
        upstreamResponse.pipe(clientResponse);
      }
    );

    upstreamRequest.on('error', () => clientResponse.destroy());
    clientRequest.pipe(upstreamRequest);
  });

  server.on('connection', () => {
    clientConnections += 1;
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    brunoConfig: brunoConfigFor(port),
    servePacFile: () => servePacFileFor(port),
    connectionsAccepted: () => clientConnections,
    close: () => new Promise((resolve) => server.close(resolve))
  };
};

const startProxyForHttps = async () => {
  let tunnels = 0;
  const openSockets = [];
  const server = http.createServer();

  server.on('connect', (request, clientSocket, bytesAlreadySent) => {
    tunnels += 1;
    openSockets.push(clientSocket);
    const [targetHost, targetPort] = request.url.split(':');
    const upstreamSocket = net.connect(Number(targetPort), targetHost, () => {
      openSockets.push(upstreamSocket);
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (bytesAlreadySent?.length) {
        upstreamSocket.write(bytesAlreadySent);
      }
      upstreamSocket.pipe(clientSocket);
      clientSocket.pipe(upstreamSocket);
    });

    upstreamSocket.on('error', () => clientSocket.destroy());
    clientSocket.on('error', () => upstreamSocket.destroy());
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    brunoConfig: brunoConfigFor(port),
    tunnelsOpened: () => tunnels,
    close: async () => {
      openSockets.forEach((socket) => socket.destroy());
      await new Promise((resolve) => server.close(resolve));
    }
  };
};

module.exports = { startProxyForHttp, startProxyForHttps };
