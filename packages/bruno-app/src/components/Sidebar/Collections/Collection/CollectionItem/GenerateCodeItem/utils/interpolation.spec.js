import { interpolateObject } from './interpolation';

describe('interpolation utils', () => {
  describe('interpolateObject', () => {
    it('should interpolate variables across all data types and nesting levels', () => {
      const complexRequest = {
        url: 'https://{{host}}/api',
        method: 'POST',
        headers: [{ name: 'X-{{headerName}}', value: '{{headerValue}}', enabled: true }],
        auth: {
          basic: {
            username: '{{user}}',
            password: 'pass-{{passVar}}'
          }
        },
        body: {
          mode: 'json',
          json: '{"id": "{{id}}"}'
        },
        metadata: {
          tags: ['tag-{{id}}', 'stable'],
          rating: 100,
          isActive: true,
          isNull: null
        }
      };

      const variables = {
        host: 'api.example.com',
        headerName: 'App-ID',
        headerValue: 'val-123',
        user: 'admin',
        passVar: 'secure',
        id: '99'
      };

      const result = interpolateObject(complexRequest, variables);

      expect(result).toEqual({
        url: 'https://api.example.com/api',
        method: 'POST',
        headers: [{ name: 'X-App-ID', value: 'val-123', enabled: true }],
        auth: {
          basic: {
            username: 'admin',
            password: 'pass-secure'
          }
        },
        body: {
          mode: 'json',
          json: '{"id": "99"}'
        },
        metadata: {
          tags: ['tag-99', 'stable'],
          rating: 100,
          isActive: true,
          isNull: null
        }
      });
    });

    it('should interpolate variables across all data types and nesting levels', () => {
      const variables = { x: 'ok' };

      const obj = { value: '{{x}}' };
      obj.self = obj;

      interpolateObject(obj, variables);
    });
  });
});
