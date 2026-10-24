import net, { type AddressInfo, type Socket } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { labCerts } from './lab-server';

export type ProxyCreds = { username: string; password: string };

type Counter = { tunnels: number };

/** Pipe a client socket to a freshly opened connection to `host:port`, counting the tunnel. */
const tunnel = (clientSocket: Socket, host: string, port: number, counter: Counter, head?: Buffer) => {
  const upstream = net.connect(port, host, () => {
    counter.tunnels++;
    if (head && head.length) upstream.write(head);
    clientSocket.pipe(upstream);
    upstream.pipe(clientSocket);
  });
  upstream.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => upstream.destroy());
};

/** Parse `Proxy-Authorization: Basic ...` and compare to required creds. */
const authOk = (header: string | undefined, creds?: ProxyCreds): boolean => {
  if (!creds) return true;
  if (!header) return false;
  const [scheme, value] = header.split(' ');
  if (scheme !== 'Basic' || !value) return false;
  const [user, pass] = Buffer.from(value, 'base64').toString('utf8').split(':');
  return user === creds.username && pass === creds.password;
};

/** Attach a CONNECT handler to an http(s) server; `authority` is `host:port`. */
const attachConnect = (server: http.Server | https.Server, counter: Counter, creds?: ProxyCreds) => {
  server.on('connect', (req: http.IncomingMessage, clientSocket: Socket, head: Buffer) => {
    if (!authOk(req.headers['proxy-authorization'], creds)) {
      clientSocket.end('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic\r\n\r\n');
      return;
    }
    const [host, portStr] = (req.url || '').split(':');
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    tunnel(clientSocket, host, Number(portStr), counter, head);
  });
};

/** Hand-rolled SOCKS5 server supporting no-auth (0x00) and username/password (0x02). */
const createSocks5Server = (counter: Counter, creds?: ProxyCreds): net.Server =>
  net.createServer((socket) => {
    socket.once('error', () => socket.destroy());
    let phase: 'greeting' | 'auth' | 'request' = 'greeting';
    let buf = Buffer.alloc(0);

    const fail = () => socket.destroy();

    const onData = (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);

      if (phase === 'greeting') {
        if (buf.length < 2) return;
        const nMethods = buf[1];
        if (buf.length < 2 + nMethods) return;
        const methods = buf.subarray(2, 2 + nMethods);
        buf = buf.subarray(2 + nMethods);
        if (creds) {
          if (!methods.includes(0x02)) return socket.end(Buffer.from([0x05, 0xff]));
          socket.write(Buffer.from([0x05, 0x02])); // choose username/password
          phase = 'auth';
        } else {
          if (!methods.includes(0x00)) return socket.end(Buffer.from([0x05, 0xff]));
          socket.write(Buffer.from([0x05, 0x00])); // choose no-auth
          phase = 'request';
        }
      }

      if (phase === 'auth') {
        if (buf.length < 2) return;
        const ulen = buf[1];
        if (buf.length < 2 + ulen + 1) return;
        const plen = buf[2 + ulen];
        if (buf.length < 3 + ulen + plen) return;
        const user = buf.subarray(2, 2 + ulen).toString('utf8');
        const pass = buf.subarray(3 + ulen, 3 + ulen + plen).toString('utf8');
        buf = buf.subarray(3 + ulen + plen);
        if (user !== creds!.username || pass !== creds!.password) {
          return socket.end(Buffer.from([0x01, 0x01])); // auth failure
        }
        socket.write(Buffer.from([0x01, 0x00])); // auth success
        phase = 'request';
      }

      if (phase === 'request') {
        if (buf.length < 4) return;
        const atyp = buf[3];
        let host: string;
        let offset: number;
        if (atyp === 0x01) {
          if (buf.length < 10) return;
          host = `${buf[4]}.${buf[5]}.${buf[6]}.${buf[7]}`;
          offset = 8;
        } else if (atyp === 0x03) {
          const len = buf[4];
          if (buf.length < 5 + len + 2) return;
          host = buf.subarray(5, 5 + len).toString('utf8');
          offset = 5 + len;
        } else if (atyp === 0x04) {
          if (buf.length < 22) return;
          const parts: string[] = [];
          for (let i = 0; i < 16; i += 2) parts.push(buf.readUInt16BE(4 + i).toString(16));
          host = parts.join(':');
          offset = 20;
        } else {
          return fail();
        }
        const port = buf.readUInt16BE(offset);
        buf = Buffer.alloc(0);
        socket.removeListener('data', onData);
        // The socket is in flowing mode; pause it so no client bytes are dropped before the pipe is set
        // up. Open the upstream first and send the SOCKS success reply only once connected — the client
        // waits for that reply before sending anything, so the pipe is always ready in time.
        socket.pause();
        const upstream = net.connect(port, host, () => {
          counter.tunnels++;
          // success reply: VER REP RSV ATYP(ipv4) BND.ADDR(0.0.0.0) BND.PORT(0)
          socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
          socket.pipe(upstream);
          upstream.pipe(socket);
          socket.resume();
        });
        upstream.on('error', () => socket.destroy());
      }
    };

    socket.on('data', onData);
  });

const listen = (server: http.Server | https.Server | net.Server) =>
  new Promise<number>((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)));

export type ProxyLab = {
  ports: { http: number; https: number; httpAuth: number; socks: number; socksAuth: number };
  counters: { http: Counter; https: Counter; httpAuth: Counter; socks: Counter; socksAuth: Counter };
  creds: ProxyCreds;
  certs: typeof labCerts;
  close: () => Promise<void>;
};

export async function startProxies(): Promise<ProxyLab> {
  const creds: ProxyCreds = { username: 'proxyuser', password: 'proxypass' };
  const counters = {
    http: { tunnels: 0 },
    https: { tunnels: 0 },
    httpAuth: { tunnels: 0 },
    socks: { tunnels: 0 },
    socksAuth: { tunnels: 0 }
  };

  const httpProxy = http.createServer();
  attachConnect(httpProxy, counters.http);
  const httpAuthProxy = http.createServer();
  attachConnect(httpAuthProxy, counters.httpAuth, creds);
  const httpsProxy = https.createServer({ key: labCerts.serverKey, cert: labCerts.serverCert });
  attachConnect(httpsProxy, counters.https);
  const socksProxy = createSocks5Server(counters.socks);
  const socksAuthProxy = createSocks5Server(counters.socksAuth, creds);

  const servers = [httpProxy, httpAuthProxy, httpsProxy, socksProxy, socksAuthProxy];
  const sockets = new Set<Socket>();
  for (const server of servers) {
    server.on('connection', (socket: Socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    });
  }

  const [http1, httpAuth, httpsP, socksP, socksAuth] = await Promise.all(servers.map(listen));

  return {
    ports: { http: http1, https: httpsP, httpAuth, socks: socksP, socksAuth },
    counters,
    creds,
    certs: labCerts,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await Promise.all(servers.map((s) => new Promise<void>((r) => s.close(() => r()))));
    }
  };
}
