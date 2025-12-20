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
        params: {
          someArray: ['tag-{{id}}', 'stable'],
          value: 100,
          enabled: true,
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
        params: {
          someArray: ['tag-99', 'stable'],
          value: 100,
          enabled: true,
          isNull: null
        }
      });
    });

    it('should not iterate endlessly for circular references', () => {
      const variables = { x: 'ok' };

      const obj = { value: '{{x}}' };
      obj.self = obj;

      expect(() => interpolateObject(obj, variables)).toThrow('Circular reference detected during interpolation.');
    });

    it('should leave the placeholder intact if the variable is missing', () => {
      const variables = { known: 'value' };
      const obj = {
        field: '{{known}} and {{missing}}'
      };

      const result = interpolateObject(obj, variables);

      expect(result).toEqual({
        field: 'value and {{missing}}'
      });
    });

    it('should interpolate text body', () => {
      const body = {
        mode: 'text',
        text: 'Hello {{name}}'
      };
      const result = interpolateObject(body, { name: 'World' });
      expect(result.text).toBe('Hello World');
    });

    it('should return null when body is null', () => {
      expect(interpolateObject(null, { a: 1 })).toBeNull();
    });
  });
});
