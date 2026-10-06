import { createServer, type RequestListener } from 'http';
import type { AddressInfo } from 'net';
import { once } from 'events';

export const startLocalServer = async (handler?: RequestListener) => {
  const server = createServer(handler).listen(0, '127.0.0.1');
  await once(server, 'listening');

  return {
    server,
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: () => {
      server.closeAllConnections();
      server.close();
    }
  };
};
