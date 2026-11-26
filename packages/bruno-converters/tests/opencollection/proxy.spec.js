import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

describe('OpenCollection proxy targetProtocols conversion', () => {
  it('round-trips restricted targetProtocols via extensions.bruno.proxy without polluting oc.config.proxy', () => {
    const oc = brunoToOpenCollection({
      name: 'Proxy Collection',
      brunoConfig: {
        proxy: {
          inherit: false,
          config: {
            protocol: 'http',
            targetProtocols: { http: false, https: true },
            hostname: '127.0.0.1',
            port: 8080,
            auth: { username: '', password: '' },
            bypassProxy: ''
          }
        }
      }
    });

    expect(oc.config?.proxy?.config?.targetProtocols).toBeUndefined();
    expect(oc.extensions?.bruno?.proxy?.targetProtocols).toEqual({ http: false, https: true });

    const roundTripped = openCollectionToBruno(oc);
    expect(roundTripped.brunoConfig.proxy.config.targetProtocols).toEqual({ http: false, https: true });
  });

  it('omits extensions.bruno.proxy when both HTTP and HTTPS are enabled', () => {
    const oc = brunoToOpenCollection({
      name: 'Default Proxy Collection',
      brunoConfig: {
        proxy: {
          inherit: false,
          config: {
            protocol: 'http',
            targetProtocols: { http: true, https: true },
            hostname: '127.0.0.1',
            port: 8080,
            auth: { username: '', password: '' },
            bypassProxy: ''
          }
        }
      }
    });

    expect(oc.extensions?.bruno?.proxy).toBeUndefined();
    const roundTripped = openCollectionToBruno(oc);
    expect(roundTripped.brunoConfig.proxy.config.targetProtocols).toBeUndefined();
  });

  it('drops stale config.proxy.config.targetProtocols when extension explicitly enables both protocols', () => {
    const converted = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'Override Collection' },
      config: {
        proxy: {
          inherit: false,
          config: {
            protocol: 'http',
            targetProtocols: { http: false, https: true },
            hostname: '127.0.0.1',
            port: 8080
          }
        }
      },
      extensions: {
        bruno: {
          proxy: {
            targetProtocols: { http: true, https: true }
          }
        }
      }
    });

    expect(converted.brunoConfig.proxy.config.targetProtocols).toBeUndefined();
  });
});
