import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export const PAC_PORT = 18080;
export const PROXY_PORT = 18888;
export const TARGET_PORT = 19000;

export interface TestServers {
  pacServer: http.Server;
  proxyServer: http.Server;
  targetServer: http.Server;
}

/** Serves .pac files from the pac-files/ directory. */
function createPacServer(): Promise<http.Server> {
  const pacDir = path.join(__dirname, 'pac-files');
  const server = http.createServer((req, res) => {
    const filename = (req.url ?? '/').replace(/^\//, '') || 'test.pac';
    const filepath = path.join(pacDir, filename);
    fs.readFile(filepath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/x-ns-proxy-autoconfig' });
      res.end(data);
    });
  });
  return listen(server, PAC_PORT);
}

/**
 * Plain HTTP proxy. Forwards requests and injects `x-proxied: test-proxy`
 * into every response so tests can confirm traffic went through it.
 */
function createProxyServer(): Promise<http.Server> {
  const server = http.createServer((clientReq, clientRes) => {
    let targetUrl: URL;
    try {
      targetUrl = new URL(clientReq.url!);
    } catch {
      clientRes.writeHead(400);
      clientRes.end('Bad request URL');
      return;
    }

    const options: http.RequestOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 80,
      path: targetUrl.pathname + targetUrl.search,
      method: clientReq.method,
      headers: { ...clientReq.headers, host: targetUrl.host }
    };
    delete (options.headers as Record<string, string>)['proxy-connection'];

    const proxyReq = http.request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers, 'x-proxied': 'test-proxy' };
      clientRes.writeHead(proxyRes.statusCode!, headers);
      proxyRes.pipe(clientRes);
    });

    proxyReq.on('error', (err) => {
      if (!clientRes.headersSent) {
        clientRes.writeHead(502);
      }
      clientRes.end(`Proxy error: ${err.message}`);
    });

    clientReq.pipe(proxyReq);
  });
  return listen(server, PROXY_PORT);
}

/** Simple JSON echo server — the requests' target. */
function createTargetServer(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, path: req.url }));
  });
  return listen(server, TARGET_PORT);
}

function listen(server: http.Server, port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

export async function startServers(): Promise<TestServers> {
  const [pacServer, proxyServer, targetServer] = await Promise.all([
    createPacServer(),
    createProxyServer(),
    createTargetServer()
  ]);
  return { pacServer, proxyServer, targetServer };
}

export async function stopServers(servers: TestServers): Promise<void> {
  await Promise.all([
    close(servers.pacServer),
    close(servers.proxyServer),
    close(servers.targetServer)
  ]);
}
