import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

describe('brunoToOpenCollection (export): http.version', () => {
  it('writes http.version under extensions.bruno.http', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: { http: { version: 'http2' } },
      items: []
    });
    expect(oc.extensions?.bruno?.http?.version).toBe('http2');
  });

  it('writes nothing when the collection has no http.version', () => {
    const oc = brunoToOpenCollection({ name: 'API', brunoConfig: {}, items: [] });
    expect(oc.extensions?.bruno?.http).toBeUndefined();
  });
});

describe('openCollectionToBruno (import): http.version', () => {
  it('reads http.version from extensions.bruno.http', () => {
    const { brunoConfig } = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      extensions: { bruno: { http: { version: 'auto' } } }
    });
    expect(brunoConfig.http?.version).toBe('auto');
  });

  it('leaves http unset when the extension is absent', () => {
    const { brunoConfig } = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' }
    });
    expect(brunoConfig.http).toBeUndefined();
  });
});

describe('http.version: export then import keeps it the same', () => {
  ['http1', 'http2', 'auto', 'inherit'].forEach((version) => {
    it(`preserves "${version}" across a round trip`, () => {
      const oc = brunoToOpenCollection({
        name: 'API',
        brunoConfig: { http: { version } },
        items: []
      });
      const { brunoConfig } = openCollectionToBruno(oc);
      expect(brunoConfig.http?.version).toBe(version);
    });
  });
});
