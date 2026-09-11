import http from 'node:http';
import { applyOmitConnectionToAxiosConfig } from './omit-connection';

describe('applyOmitConnectionToAxiosConfig', () => {
  let server: http.Server;
  let baseUrl: string;
  let seenHeaders: Record<string, string | string[] | undefined>;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      seenHeaders = req.headers;
      res.writeHead(200);
      res.end('ok');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as http.AddressInfo).port}/`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('removes Connection from the wire even with a keepAlive agent', async () => {
    const axios = require('axios');
    const instance = axios.create({
      proxy: false,
      maxRedirects: 0,
      httpAgent: new http.Agent({ keepAlive: true })
    });

    instance.interceptors.request.use((config: any) => {
      applyOmitConnectionToAxiosConfig(config);
      return config;
    });

    await instance.get(baseUrl);

    expect(seenHeaders.connection).toBeUndefined();
  });
});
