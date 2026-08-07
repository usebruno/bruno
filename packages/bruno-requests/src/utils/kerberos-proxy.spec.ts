jest.mock('node:dns', () => ({ promises: { resolveCname: jest.fn(), lookup: jest.fn(), reverse: jest.fn() } }));

import { promises as dnsMock } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import {
  kerberosSpnForHost,
  canonicalizeSpnHost,
  getKerberosProxyAuthHeader,
  __setKerberosLoaderForTests
} from './kerberos-proxy';
import { PatchedHttpsProxyAgent, PatchedHttpProxyAgent } from './http-https-agents';

const FAKE_TOKEN = 'FAKETOKENBASE64==';

const fakeKerberos = (spnLog: string[]) => ({
  initializeClient: async (spn: string) => {
    spnLog.push(spn);
    return {
      step: async (challenge: string) => {
        expect(challenge).toBe('');
        return FAKE_TOKEN;
      }
    };
  }
});

const realPlatform = process.platform;
const setPlatform = (platform: string) => Object.defineProperty(process, 'platform', { value: platform, configurable: true });

describe('kerberos proxy auth', () => {
  afterEach(() => {
    __setKerberosLoaderForTests(null);
    (dnsMock.resolveCname as jest.Mock).mockReset();
    (dnsMock.lookup as unknown as jest.Mock).mockReset();
    (dnsMock.reverse as jest.Mock).mockReset();
    setPlatform(realPlatform);
  });

  describe('kerberosSpnForHost', () => {
    const separator = process.platform === 'win32' ? '/' : '@';

    it('uses the HTTP service class', () => {
      expect(kerberosSpnForHost('proxy.example.com')).toBe(`HTTP${separator}proxy.example.com`);
    });

    it('strips a trailing dot from rooted DNS names', () => {
      expect(kerberosSpnForHost('proxy.example.com.')).toBe(`HTTP${separator}proxy.example.com`);
    });
  });

  describe('canonicalizeSpnHost', () => {
    it('follows a CNAME chain to the canonical hostname', async () => {
      (dnsMock.resolveCname as jest.Mock)
        .mockResolvedValueOnce(['proxy-vip.corp.example.com'])
        .mockResolvedValueOnce(['proxy1.corp.example.com'])
        .mockRejectedValueOnce(Object.assign(new Error('ENODATA'), { code: 'ENODATA' }));

      await expect(canonicalizeSpnHost('proxy')).resolves.toBe('proxy1.corp.example.com');
    });

    it('returns qualified names unchanged when they have no CNAME record', async () => {
      (dnsMock.resolveCname as jest.Mock).mockRejectedValue(
        Object.assign(new Error('ENODATA'), { code: 'ENODATA' })
      );

      await expect(canonicalizeSpnHost('proxy.corp.example.com')).resolves.toBe('proxy.corp.example.com');
      expect(dnsMock.lookup).not.toHaveBeenCalled();
    });

    it('strips a trailing dot before canonicalizing', async () => {
      (dnsMock.resolveCname as jest.Mock).mockRejectedValue(
        Object.assign(new Error('ENODATA'), { code: 'ENODATA' })
      );

      await expect(canonicalizeSpnHost('proxy.corp.example.com.')).resolves.toBe('proxy.corp.example.com');
      expect(dnsMock.lookup).not.toHaveBeenCalled();
    });

    it('terminates on self-referential CNAME records', async () => {
      (dnsMock.resolveCname as jest.Mock).mockResolvedValue(['proxy.corp.example.com']);

      await expect(canonicalizeSpnHost('proxy.corp.example.com')).resolves.toBe('proxy.corp.example.com');
    });

    it('caps pathological CNAME chains', async () => {
      let i = 0;
      (dnsMock.resolveCname as jest.Mock).mockImplementation(async () => [`hop${++i}.example.com`]);

      await expect(canonicalizeSpnHost('loop.example.com')).resolves.toBe('hop8.example.com');
    });

    it('canonicalizes unqualified shortnames via OS lookup + reverse DNS', async () => {
      // c-ares cannot expand shortnames (no suffix search) — simulate that:
      (dnsMock.resolveCname as jest.Mock).mockRejectedValue(
        Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
      );
      (dnsMock.lookup as unknown as jest.Mock).mockResolvedValue({ address: '10.1.2.3', family: 4 });
      (dnsMock.reverse as jest.Mock).mockResolvedValue(['proxy1.corp.example.com']);

      await expect(canonicalizeSpnHost('proxyalias')).resolves.toBe('proxy1.corp.example.com');
      expect(dnsMock.lookup).toHaveBeenCalledWith('proxyalias');
      expect(dnsMock.reverse).toHaveBeenCalledWith('10.1.2.3');
    });

    it('returns the shortname unchanged when the OS lookup fails', async () => {
      (dnsMock.resolveCname as jest.Mock).mockRejectedValue(
        Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
      );
      (dnsMock.lookup as unknown as jest.Mock).mockRejectedValue(
        Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
      );

      await expect(canonicalizeSpnHost('proxyalias')).resolves.toBe('proxyalias');
    });

    it('returns the shortname unchanged when reverse DNS has no PTR', async () => {
      (dnsMock.resolveCname as jest.Mock).mockRejectedValue(
        Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
      );
      (dnsMock.lookup as unknown as jest.Mock).mockResolvedValue({ address: '10.1.2.3', family: 4 });
      (dnsMock.reverse as jest.Mock).mockResolvedValue([]);

      await expect(canonicalizeSpnHost('proxyalias')).resolves.toBe('proxyalias');
    });
  });

  describe('getKerberosProxyAuthHeader', () => {
    it('mints a Negotiate header via the kerberos module', async () => {
      const spnLog: string[] = [];
      __setKerberosLoaderForTests(async () => fakeKerberos(spnLog));

      const header = await getKerberosProxyAuthHeader('proxy.example.com');
      expect(header).toBe(`Negotiate ${FAKE_TOKEN}`);
      expect(spnLog).toEqual([kerberosSpnForHost('proxy.example.com')]);
    });

    it('canonicalizes the hostname on win32', async () => {
      setPlatform('win32');
      (dnsMock.resolveCname as jest.Mock)
        .mockResolvedValueOnce(['proxy-real.corp.example.com'])
        .mockRejectedValueOnce(Object.assign(new Error('ENODATA'), { code: 'ENODATA' }));
      const spnLog: string[] = [];
      __setKerberosLoaderForTests(async () => fakeKerberos(spnLog));

      await getKerberosProxyAuthHeader('proxy-alias.corp.example.com');
      expect(spnLog).toEqual(['HTTP/proxy-real.corp.example.com']);
    });

    it('does not canonicalize on GSSAPI platforms (libkrb5 does it)', async () => {
      setPlatform('linux');
      const spnLog: string[] = [];
      __setKerberosLoaderForTests(async () => fakeKerberos(spnLog));

      await getKerberosProxyAuthHeader('proxy-alias');
      expect(dnsMock.resolveCname).not.toHaveBeenCalled();
      expect(spnLog).toEqual(['HTTP@proxy-alias']);
    });

    it('raises an actionable error when the kerberos module is unavailable', async () => {
      __setKerberosLoaderForTests(async () => {
        throw new Error('Cannot find module kerberos');
      });

      await expect(getKerberosProxyAuthHeader('proxy.example.com')).rejects.toThrow(
        /optional "kerberos" module could not be loaded/
      );
    });

    it('raises an actionable error when no ticket is available', async () => {
      __setKerberosLoaderForTests(async () => ({
        initializeClient: async () => {
          throw new Error('No credentials cache found');
        }
      }));

      await expect(getKerberosProxyAuthHeader('proxy.example.com')).rejects.toThrow(/kinit/);
    });
  });

  describe('PatchedHttpProxyAgent (plain HTTP via proxy)', () => {
    it('adds Proxy-Authorization when enabled via the kerberosProxyAuth option', async () => {
      __setKerberosLoaderForTests(async () => fakeKerberos([]));

      const seenHeaders: Array<string | undefined> = [];
      const proxyServer = http.createServer((req, res) => {
        seenHeaders.push(req.headers['proxy-authorization']);
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('ok');
      });
      await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
      const { port } = proxyServer.address() as net.AddressInfo;

      try {
        const agent = new PatchedHttpProxyAgent(`http://127.0.0.1:${port}`, { kerberosProxyAuth: true });
        const body = await new Promise<string>((resolve, reject) => {
          const req = http.get('http://target.invalid/hello', { agent }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
          });
          req.on('error', reject);
        });

        expect(body).toBe('ok');
        expect(seenHeaders).toEqual([`Negotiate ${FAKE_TOKEN}`]);
      } finally {
        proxyServer.close();
      }
    });

    it('does not add Proxy-Authorization when the option is not set', async () => {
      const seenHeaders: Array<string | undefined> = [];
      const proxyServer = http.createServer((req, res) => {
        seenHeaders.push(req.headers['proxy-authorization']);
        res.writeHead(200);
        res.end('ok');
      });
      await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
      const { port } = proxyServer.address() as net.AddressInfo;

      try {
        const agent = new PatchedHttpProxyAgent(`http://127.0.0.1:${port}`);
        await new Promise<void>((resolve, reject) => {
          const req = http.get('http://target.invalid/hello', { agent }, (res) => {
            res.resume();
            res.on('end', resolve);
          });
          req.on('error', reject);
        });

        expect(seenHeaders).toEqual([undefined]);
      } finally {
        proxyServer.close();
      }
    });
  });

  describe('PatchedHttpsProxyAgent (CONNECT tunnel)', () => {
    it('adds Proxy-Authorization to the CONNECT request when enabled via the kerberosProxyAuth option', async () => {
      __setKerberosLoaderForTests(async () => fakeKerberos([]));

      let connectPayload = '';
      const proxyServer = net.createServer((socket) => {
        socket.on('data', (chunk) => {
          connectPayload += chunk.toString('utf8');
          if (connectPayload.includes('\r\n\r\n')) {
            // Reject the tunnel; we only care about the CONNECT headers.
            socket.end('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n');
          }
        });
      });
      await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
      const { port } = proxyServer.address() as net.AddressInfo;

      try {
        const agent = new PatchedHttpsProxyAgent(`http://127.0.0.1:${port}`, { kerberosProxyAuth: true });
        // Depending on the agent version, a rejected CONNECT surfaces either as
        // a request error or as the replayed 407 response. We only assert on
        // the CONNECT payload the proxy saw.
        await new Promise<void>((resolve) => {
          const req = https.get('https://target.invalid/hello', { agent }, (res) => {
            res.resume();
            resolve();
          });
          req.on('error', () => resolve());
        });

        expect(connectPayload).toContain('CONNECT target.invalid:443 HTTP/1.1');
        expect(connectPayload).toContain(`Proxy-Authorization: Negotiate ${FAKE_TOKEN}`);
      } finally {
        proxyServer.close();
      }
    });

    it('serves each concurrent CONNECT its own single-use token', async () => {
      let mint = 0;
      __setKerberosLoaderForTests(async () => ({
        initializeClient: async () => ({ step: async () => `TOKEN-${++mint}` })
      }));

      const seenTokens: string[] = [];
      const proxyServer = net.createServer((socket) => {
        let payload = '';
        socket.on('data', (chunk) => {
          payload += chunk.toString('utf8');
          if (payload.includes('\r\n\r\n')) {
            const match = payload.match(/Proxy-Authorization: (.*)\r\n/);
            seenTokens.push(match ? match[1] : '(none)');
            socket.end('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n');
          }
        });
      });
      await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
      const { port } = proxyServer.address() as net.AddressInfo;

      try {
        const agent = new PatchedHttpsProxyAgent(`http://127.0.0.1:${port}`, { kerberosProxyAuth: true });
        await Promise.all(
          [1, 2, 3].map(
            (i) =>
              new Promise<void>((resolve) => {
                const req = https.get(`https://target${i}.invalid/`, { agent }, (res) => {
                  res.resume();
                  resolve();
                });
                req.on('error', () => resolve());
              })
          )
        );

        expect(seenTokens.sort()).toEqual(['Negotiate TOKEN-1', 'Negotiate TOKEN-2', 'Negotiate TOKEN-3']);
      } finally {
        proxyServer.close();
      }
    });

    it('does not add Proxy-Authorization to the CONNECT request when the option is not set', async () => {
      let connectPayload = '';
      const proxyServer = net.createServer((socket) => {
        socket.on('data', (chunk) => {
          connectPayload += chunk.toString('utf8');
          if (connectPayload.includes('\r\n\r\n')) {
            socket.end('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n');
          }
        });
      });
      await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
      const { port } = proxyServer.address() as net.AddressInfo;

      try {
        const agent = new PatchedHttpsProxyAgent(`http://127.0.0.1:${port}`, {});
        await new Promise<void>((resolve) => {
          const req = https.get('https://target.invalid/hello', { agent }, (res) => {
            res.resume();
            resolve();
          });
          req.on('error', () => resolve());
        });

        expect(connectPayload).toContain('CONNECT target.invalid:443 HTTP/1.1');
        expect(connectPayload.toLowerCase()).not.toContain('proxy-authorization');
      } finally {
        proxyServer.close();
      }
    });
  });
});
