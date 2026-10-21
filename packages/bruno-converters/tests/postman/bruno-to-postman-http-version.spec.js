import { describe, it, expect } from '@jest/globals';
import brunoToPostman from '../../src/postman/bruno-to-postman';

const exportWithHttpVersion = (httpVersion) => {
  const brunoCollection = {
    name: 'Test Collection',
    items: [
      {
        uid: '1',
        name: 'Req',
        type: 'http-request',
        seq: 1,
        request: {
          url: 'https://api.example.com/test',
          method: 'GET',
          headers: [],
          params: [],
          auth: { mode: 'inherit' },
          body: { mode: 'none' }
        },
        settings: httpVersion === undefined ? {} : { httpVersion }
      }
    ],
    root: { request: { auth: { mode: 'none' }, headers: [] } }
  };
  return brunoToPostman(brunoCollection).item[0];
};

describe('bruno-to-postman httpVersion export (protocolProfileBehavior.protocolVersion)', () => {
  it.each([
    ['http1.1', 'http1'],
    ['http2', 'http2'],
    ['auto', 'auto']
  ])('maps Bruno httpVersion %p to Postman protocolVersion %p', (httpVersion, expected) => {
    const item = exportWithHttpVersion(httpVersion);
    expect(item.protocolProfileBehavior).toBeDefined();
    expect(item.protocolProfileBehavior.protocolVersion).toBe(expected);
  });

  it.each(['inherit', undefined, 'bogus'])(
    'omits protocolVersion for %p (no deliberate version)',
    (httpVersion) => {
      const item = exportWithHttpVersion(httpVersion);
      const ppb = item.protocolProfileBehavior;
      // Either no protocolProfileBehavior at all, or it exists without protocolVersion.
      expect(ppb?.protocolVersion).toBeUndefined();
    }
  );
});
