import {
  getNormalRequestData,
  getExampleRequestData,
  getRequestData,
  buildFinalItem
} from './build-final-item';

jest.mock('utils/auth', () => ({
  resolveInheritedAuth: jest.fn()
}));

import { resolveInheritedAuth } from 'utils/auth';

describe('build-final-item utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNormalRequestData', () => {
    it('should return request data from item.request when no draft', () => {
      const item = {
        request: {
          url: 'https://example.com',
          method: 'GET',
          params: [{ name: 'id', value: '1' }],
          auth: { mode: 'inherit' }
        }
      };

      const result = getNormalRequestData(item);

      expect(result.url).toBe('https://example.com');
      expect(result.params).toEqual([{ name: 'id', value: '1' }]);
      expect(result.request).toBe(item.request);
    });

    it('should return request data from item.draft.request when draft exists', () => {
      const item = {
        request: {
          url: 'https://saved.com',
          params: [],
          auth: { mode: 'none' }
        },
        draft: {
          request: {
            url: 'https://draft.com',
            params: [{ name: 'draft', value: 'true' }],
            auth: { mode: 'inherit' }
          }
        }
      };

      const result = getNormalRequestData(item);

      expect(result.url).toBe('https://draft.com');
      expect(result.params).toEqual([{ name: 'draft', value: 'true' }]);
      expect(result.request).toBe(item.draft.request);
    });
  });

  describe('getExampleRequestData', () => {
    it('should return example request data when example exists', () => {
      const item = {
        uid: 'item1',
        request: {
          url: 'https://main.com',
          method: 'POST',
          body: { json: '{"main": true}' },
          auth: { mode: 'inherit' }
        },
        examples: [
          {
            uid: 'ex1',
            request: {
              url: 'https://example.com',
              params: [],
              body: { json: '{"example": true}' }
            }
          }
        ]
      };

      const result = getExampleRequestData(item, 'ex1');

      expect(result.url).toBe('https://example.com');
      expect(result.request.body.json).toBe('{"example": true}');
    });

    it('should fallback to normal request when example not found', () => {
      const item = {
        request: {
          url: 'https://main.com',
          params: []
        },
        examples: []
      };

      const result = getExampleRequestData(item, 'nonexistent');

      expect(result.url).toBe('https://main.com');
    });

    it('should fallback to normal request when exampleUid is null', () => {
      const item = {
        request: {
          url: 'https://main.com',
          params: []
        }
      };

      const result = getExampleRequestData(item, null);

      expect(result.url).toBe('https://main.com');
    });
  });

  describe('getRequestData', () => {
    it('should return normal request data when isExample is false', () => {
      const item = {
        request: { url: 'https://normal.com', params: [] }
      };

      const result = getRequestData(item, false, null);

      expect(result.url).toBe('https://normal.com');
    });

    it('should return example request data when isExample is true', () => {
      const item = {
        request: { url: 'https://main.com', params: [] },
        examples: [{ uid: 'ex1', request: { url: 'https://example.com', params: [] } }]
      };

      const result = getRequestData(item, true, 'ex1');

      expect(result.url).toBe('https://example.com');
    });
  });

  describe('buildFinalItem', () => {
    it('should build final item with resolved auth for normal request', () => {
      const item = {
        uid: 'r1',
        request: {
          url: 'https://example.com',
          method: 'GET',
          headers: [],
          body: { mode: 'none' },
          auth: { mode: 'inherit' }
        }
      };

      const collection = {
        uid: 'c1',
        root: { request: { auth: { mode: 'none' } } }
      };

      resolveInheritedAuth.mockReturnValue({
        ...item.request,
        auth: { mode: 'basic', basic: { username: 'user', password: 'pass' } }
      });

      const result = buildFinalItem({
        item,
        collection,
        isExample: false,
        exampleUid: null,
        finalUrl: 'https://example.com/api'
      });

      expect(result.request.auth.mode).toBe('basic');
      expect(result.request.auth.basic.username).toBe('user');
      expect(result.request.auth.basic.password).toBe('pass');
      expect(result.request.url).toBe('https://example.com/api');
      expect(result.request.method).toBe('GET');
    });

    it('should build final item with resolved auth for example request', () => {
      const item = {
        uid: 'r1',
        request: {
          url: 'https://main.com',
          method: 'POST',
          headers: [{ name: 'X-Main', value: 'true' }],
          body: { json: '{"main": true}' },
          auth: { mode: 'inherit' }
        },
        examples: [
          {
            uid: 'ex1',
            request: {
              url: 'https://example.com',
              method: 'POST',
              headers: [{ name: 'X-Example', value: 'true' }],
              body: { json: '{"example": true}' },
              params: []
            }
          }
        ]
      };

      const collection = {
        uid: 'c1',
        root: { request: { auth: { mode: 'none' } } }
      };

      resolveInheritedAuth.mockReturnValue({
        ...item.request,
        auth: { mode: 'bearer', bearer: { token: 'secret-token' } }
      });

      const result = buildFinalItem({
        item,
        collection,
        isExample: true,
        exampleUid: 'ex1',
        finalUrl: 'https://example.com/api'
      });

      // Auth is resolved from item (not example)
      expect(result.request.auth.mode).toBe('bearer');
      expect(result.request.auth.bearer.token).toBe('secret-token');

      // Example data is preserved (not overwritten by main request)
      expect(result.request.body.json).toBe('{"example": true}');
      expect(result.request.headers).toEqual([{ name: 'X-Example', value: 'true' }]);

      expect(result.request.url).toBe('https://example.com/api');
    });

    it('should preserve example body when auth is inherited', () => {
      const item = {
        uid: 'r1',
        request: {
          method: 'POST',
          body: { json: '{"main": "data"}' },
          auth: { mode: 'inherit' }
        },
        examples: [
          {
            uid: 'ex1',
            request: {
              method: 'POST',
              body: { json: '{"example": "different data"}' },
              params: []
            }
          }
        ]
      };

      const collection = { root: { request: { auth: { mode: 'none' } } } };

      resolveInheritedAuth.mockReturnValue({
        ...item.request,
        auth: { mode: 'basic', basic: { username: 'u', password: 'p' } }
      });

      const result = buildFinalItem({
        item,
        collection,
        isExample: true,
        exampleUid: 'ex1',
        finalUrl: 'https://api.com'
      });

      // Example body should be preserved
      expect(result.request.body.json).toBe('{"example": "different data"}');

      // Auth should be resolved
      expect(result.request.auth.mode).toBe('basic');
    });
  });
});
