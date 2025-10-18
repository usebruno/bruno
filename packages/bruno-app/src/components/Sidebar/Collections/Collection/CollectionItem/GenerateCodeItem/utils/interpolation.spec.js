import { interpolateHeaders, interpolateBody } from './interpolation';

describe('interpolation utils', () => {
  describe('interpolateHeaders', () => {
    it('should interpolate variables in header name and value while preserving other props', () => {
      const headers = [
        { uid: '1', name: 'X-{{var}}', value: 'value-{{var}}', enabled: true }
      ];
      const variables = { var: 'test' };

      const result = interpolateHeaders(headers, variables);
      expect(result).toEqual([
        {
          uid: '1',
          name: 'X-test',
          value: 'value-test',
          enabled: true
        }
      ]);
    });
  });

  describe('interpolateBody', () => {
    it('should interpolate JSON body strings and keep formatting', () => {
      const body = {
        mode: 'json',
        json: '{"name": "{{username}}"}'
      };
      const variables = { username: 'bruno' };

      const result = interpolateBody(body, variables);
      expect(result.json).toBe('{\n  "name": "bruno"\n}');
    });

    it('should interpolate text body', () => {
      const body = {
        mode: 'text',
        text: 'Hello {{name}}'
      };
      const result = interpolateBody(body, { name: 'World' });
      expect(result.text).toBe('Hello World');
    });

    it('should return null when body is null', () => {
      expect(interpolateBody(null, { a: 1 })).toBeNull();
    });
  });
});