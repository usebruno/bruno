import { interpolateAuth, interpolateHeaders, interpolateBody, interpolateParams } from './interpolation';

describe('interpolation utils', () => {
  describe('interpolateAuth', () => {
    it('should interpolate auth object', () => {
      const auth = {
        mode: 'basic',
        basic: {
          username: '{{user}}',
          password: '{{pass}}'
        }
      };
      const variables = { user: 'admin', pass: 'secret' };

      const result = interpolateAuth(auth, variables);

      expect(result).toEqual({
        mode: 'basic',
        basic: {
          username: 'admin',
          password: 'secret'
        }
      });
    });

    it('should return null for null auth', () => {
      expect(interpolateAuth(null, {})).toBeNull();
    });

    it('should return undefined for undefined auth', () => {
      expect(interpolateAuth(undefined, {})).toBeUndefined();
    });
  });

  describe('interpolateHeaders', () => {
    it('should interpolate header names and values', () => {
      const headers = [
        { name: 'X-{{headerName}}', value: '{{headerValue}}', enabled: true },
        { name: 'Content-Type', value: 'application/json', enabled: true }
      ];
      const variables = { headerName: 'Custom', headerValue: 'test-value' };

      const result = interpolateHeaders(headers, variables);

      expect(result).toEqual([
        { name: 'X-Custom', value: 'test-value', enabled: true },
        { name: 'Content-Type', value: 'application/json', enabled: true }
      ]);
    });

    it('should return empty array for empty headers', () => {
      expect(interpolateHeaders([], {})).toEqual([]);
    });
  });

  describe('interpolateBody', () => {
    it('should return null for null body', () => {
      expect(interpolateBody(null, {})).toBeNull();
    });

    it('should interpolate JSON body with escaping', () => {
      const body = {
        mode: 'json',
        json: '{"name": "{{name}}", "count": {{count}}}'
      };
      const variables = { name: 'Test', count: 42 };

      const result = interpolateBody(body, variables);

      expect(result.mode).toBe('json');
      expect(JSON.parse(result.json)).toEqual({ name: 'Test', count: 42 });
    });

    it('should interpolate text body', () => {
      const body = { mode: 'text', text: 'Hello {{name}}' };
      const result = interpolateBody(body, { name: 'World' });
      expect(result.text).toBe('Hello World');
    });

    it('should interpolate xml body', () => {
      const body = { mode: 'xml', xml: '<user>{{name}}</user>' };
      const result = interpolateBody(body, { name: 'Alice' });
      expect(result.xml).toBe('<user>Alice</user>');
    });

    it('should interpolate formUrlEncoded body for enabled params only', () => {
      const body = {
        mode: 'formUrlEncoded',
        formUrlEncoded: [
          { name: 'key1', value: '{{val1}}', enabled: true },
          { name: 'key2', value: '{{val2}}', enabled: false }
        ]
      };
      const variables = { val1: 'value1', val2: 'value2' };

      const result = interpolateBody(body, variables);

      expect(result.formUrlEncoded[0].value).toBe('value1');
      expect(result.formUrlEncoded[1].value).toBe('{{val2}}');
    });

    it('should interpolate multipartForm body for enabled text params only', () => {
      const body = {
        mode: 'multipartForm',
        multipartForm: [
          { name: 'field1', value: '{{val}}', type: 'text', enabled: true },
          { name: 'field2', value: '{{val}}', type: 'file', enabled: true }
        ]
      };
      const variables = { val: 'interpolated' };

      const result = interpolateBody(body, variables);

      expect(result.multipartForm[0].value).toBe('interpolated');
      expect(result.multipartForm[1].value).toBe('{{val}}');
    });
  });

  describe('interpolateParams', () => {
    it('should interpolate param names and values', () => {
      const params = [
        { name: '{{paramName}}', value: '{{paramValue}}', enabled: true },
        { name: 'static', value: '{{val}}', enabled: false }
      ];
      const variables = { paramName: 'key', paramValue: 'value', val: 'skipped' };

      const result = interpolateParams(params, variables);

      expect(result[0].name).toBe('key');
      expect(result[0].value).toBe('value');
      expect(result[1].name).toBe('static');
      expect(result[1].value).toBe('{{val}}');
    });

    it('should return empty array for empty params', () => {
      expect(interpolateParams([], {})).toEqual([]);
    });
  });
});
