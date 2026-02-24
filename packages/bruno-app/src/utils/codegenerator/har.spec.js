if (!URL.canParse) {
  URL.canParse = (url) => {
    try {
      new URL(url); return true;
    } catch { return false; }
  };
}

import { buildHarRequest } from './har';

describe('buildHarRequest', () => {
  describe('GraphQL body', () => {
    it('should parse variables string into a JSON object', () => {
      const request = {
        method: 'POST',
        url: 'https://example.com/graphql',
        headers: [],
        body: {
          mode: 'graphql',
          graphql: {
            query: 'mutation ($id: ID!) {\n  deleteItem(id: $id) {\n   id\n  }\n}',
            variables: '{ \n    "id": "item-123"\n  }'
          }
        },
        params: []
      };

      const har = buildHarRequest({ request, headers: [] });

      const postBody = JSON.parse(har.postData.text);
      expect(postBody.query).toBe(request.body.graphql.query);
      expect(postBody.variables).toEqual({
        id: 'item-123'
      });
    });

    it('should handle empty variables string', () => {
      const request = {
        method: 'POST',
        url: 'https://example.com/graphql',
        headers: [],
        body: {
          mode: 'graphql',
          graphql: {
            query: '{ users { id name } }',
            variables: ''
          }
        },
        params: []
      };

      const har = buildHarRequest({ request, headers: [] });

      const postBody = JSON.parse(har.postData.text);
      expect(postBody.query).toBe('{ users { id name } }');
      expect(postBody.variables).toBe('');
    });

    it('should handle undefined variables', () => {
      const request = {
        method: 'POST',
        url: 'https://example.com/graphql',
        headers: [],
        body: {
          mode: 'graphql',
          graphql: {
            query: '{ users { id name } }'
          }
        },
        params: []
      };

      const har = buildHarRequest({ request, headers: [] });

      const postBody = JSON.parse(har.postData.text);
      expect(postBody.query).toBe('{ users { id name } }');
      expect(postBody.variables).toBeUndefined();
    });
  });
});
