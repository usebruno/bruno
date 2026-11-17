import { parseRequest, stringifyRequest } from './index';
import type { CollectionFormat } from './types';

describe.each<CollectionFormat>(['bru', 'yml'])('request proxy in %s', (format) => {
  describe.each(['http-request', 'graphql-request'])('%s', (type) => {
    const request = (useProxy?: boolean) => ({
      uid: 'request', name: 'Proxy request', type, seq: 1,
      settings: typeof useProxy === 'boolean' ? { useProxy } : {},
      request: {
        url: 'https://example.com', method: 'GET', headers: [], params: [],
        auth: { mode: 'none' },
        body: { mode: type === 'graphql-request' ? 'graphql' : 'none', graphql: { query: '{ hello }', variables: '' } },
        script: {}, vars: {}, assertions: [], tests: ''
      }
    });

    it.each([true, false])('preserves useProxy=%s through an on-disk round trip', (useProxy) => {
      const text = stringifyRequest(request(useProxy) as any, { format });
      const parsed = parseRequest(text, { format });
      expect(parsed.settings.useProxy).toBe(useProxy);
    });

    it('leaves legacy requests without an explicit proxy setting', () => {
      const text = stringifyRequest(request() as any, { format });
      const parsed = parseRequest(text, { format });
      expect(parsed.settings).not.toHaveProperty('useProxy');
    });
  });
});
