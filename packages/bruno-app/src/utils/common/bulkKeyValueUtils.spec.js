import { parseBulkKeyValue, serializeBulkKeyValue } from './bulkKeyValueUtils';

describe('bulkKeyValueUtils', () => {
  describe('serializeBulkKeyValue', () => {
    it('serializes basic key-value pairs (backward compat)', () => {
      const items = [
        { name: 'foo', value: 'bar', enabled: true },
        { name: 'baz', value: 'qux', enabled: false }
      ];
      expect(serializeBulkKeyValue(items)).toBe('foo:bar\n//baz:qux');
    });

    it('serializes description as @description annotation', () => {
      const items = [
        { name: 'Authorization', value: 'Bearer 123', enabled: true, description: 'auth token' }
      ];
      expect(serializeBulkKeyValue(items)).toBe(
        '@description(\'auth token\')\nAuthorization:Bearer 123'
      );
    });

    it('serializes generic annotations', () => {
      const items = [
        { name: 'X-Custom', value: 'val', enabled: true, annotations: [{ name: 'version', value: '2' }] }
      ];
      expect(serializeBulkKeyValue(items)).toBe(
        '@version(\'2\')\nX-Custom:val'
      );
    });

    it('serializes multiple annotations', () => {
      const items = [
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          description: 'custom header',
          annotations: [{ name: 'deprecated' }]
        }
      ];
      expect(serializeBulkKeyValue(items)).toBe(
        '@deprecated\n@description(\'custom header\')\nX-Custom:val'
      );
    });

    it('uses double quotes when value contains single quotes', () => {
      const items = [
        { name: 'X-Custom', value: 'val', enabled: true, description: 'O\'Reilly' }
      ];
      expect(serializeBulkKeyValue(items)).toBe(
        '@description("O\'Reilly")\nX-Custom:val'
      );
    });

    it('escapes backslashes in annotation values', () => {
      const items = [
        { name: 'X-Custom', value: 'val', enabled: true, description: 'C:\\Users\\File' }
      ];
      expect(serializeBulkKeyValue(items)).toBe(
        '@description(\'C:\\\\Users\\\\File\')\nX-Custom:val'
      );
    });

    it('serializes disabled items with annotations', () => {
      const items = [
        { name: 'X-Old', value: 'val', enabled: false, description: 'deprecated header' }
      ];
      expect(serializeBulkKeyValue(items)).toBe(
        '@description(\'deprecated header\')\n//X-Old:val'
      );
    });

    it('serializes description field over stale @description in annotations', () => {
      const items = [
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          description: 'new desc',
          annotations: [{ name: 'description', value: 'old desc' }]
        }
      ];
      expect(serializeBulkKeyValue(items)).toBe(
        '@description(\'new desc\')\nX-Custom:val'
      );
    });

    it('omits @description when description is empty string', () => {
      const items = [
        { name: 'X-Custom', value: 'val', enabled: true, description: '' }
      ];
      expect(serializeBulkKeyValue(items)).toBe('X-Custom:val');
    });

    it('preserves other annotations even when description is empty', () => {
      const items = [
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          description: '',
          annotations: [{ name: 'deprecated' }]
        }
      ];
      expect(serializeBulkKeyValue(items)).toBe(
        '@deprecated\nX-Custom:val'
      );
    });

    it('handles empty items array', () => {
      expect(serializeBulkKeyValue([])).toBe('');
    });

    it('handles null/undefined input', () => {
      expect(serializeBulkKeyValue(null)).toBe('');
      expect(serializeBulkKeyValue(undefined)).toBe('');
    });
  });

  describe('parseBulkKeyValue', () => {
    it('parses basic key-value pairs (backward compat)', () => {
      const text = 'foo: bar\n//baz: qux';
      expect(parseBulkKeyValue(text)).toEqual([
        { name: 'foo', value: 'bar', enabled: true },
        { name: 'baz', value: 'qux', enabled: false }
      ]);
    });

    it('parses annotations and sets description convenience field', () => {
      const text = '@description(\'auth token\')\nAuthorization: Bearer 123';
      expect(parseBulkKeyValue(text)).toEqual([
        {
          name: 'Authorization',
          value: 'Bearer 123',
          enabled: true,
          annotations: [{ name: 'description', value: 'auth token' }],
          description: 'auth token'
        }
      ]);
    });

    it('parses multiple annotations', () => {
      const text = '@deprecated\n@version(\'2\')\nX-Custom: val';
      expect(parseBulkKeyValue(text)).toEqual([
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          annotations: [
            { name: 'deprecated' },
            { name: 'version', value: '2' }
          ]
        }
      ]);
    });

    it('parses disabled items with annotations', () => {
      const text = '@description(\'old header\')\n//X-Old: val';
      expect(parseBulkKeyValue(text)).toEqual([
        {
          name: 'X-Old',
          value: 'val',
          enabled: false,
          annotations: [{ name: 'description', value: 'old header' }],
          description: 'old header'
        }
      ]);
    });

    it('parses double-quoted annotation values', () => {
      const text = '@description("O\'Reilly")\nX-Custom: val';
      expect(parseBulkKeyValue(text)).toEqual([
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          annotations: [{ name: 'description', value: 'O\'Reilly' }],
          description: 'O\'Reilly'
        }
      ]);
    });

    it('parses escaped newline in annotation value', () => {
      const text = '@description(\'line 1\\nline 2\')\nX-Custom: val';
      expect(parseBulkKeyValue(text)).toEqual([
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          annotations: [{ name: 'description', value: 'line 1\nline 2' }],
          description: 'line 1\nline 2'
        }
      ]);
    });

    it('parses escaped tab and carriage return', () => {
      const text = '@description(\'a\\tb\\rc\')\nX-Custom: val';
      expect(parseBulkKeyValue(text)).toEqual([
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          annotations: [{ name: 'description', value: 'a\tb\rc' }],
          description: 'a\tb\rc'
        }
      ]);
    });

    it('parses annotation without a value', () => {
      const text = '@deprecated\nX-Custom: val';
      expect(parseBulkKeyValue(text)).toEqual([
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          annotations: [{ name: 'deprecated' }]
        }
      ]);
    });

    it('ignores dangling annotations at end of text', () => {
      const text = '@description(\'orphan\')';
      expect(parseBulkKeyValue(text)).toEqual([]);
    });

    it('skips empty lines between annotations and pair', () => {
      const text = '@description(\'auth token\')\n\nAuthorization: Bearer 123';
      expect(parseBulkKeyValue(text)).toEqual([
        {
          name: 'Authorization',
          value: 'Bearer 123',
          enabled: true,
          annotations: [{ name: 'description', value: 'auth token' }],
          description: 'auth token'
        }
      ]);
    });

    it('skips malformed annotation lines', () => {
      const text = '@\nfoo: bar';
      expect(parseBulkKeyValue(text)).toEqual([
        { name: 'foo', value: 'bar', enabled: true }
      ]);
    });

    it('handles empty values', () => {
      const text = 'name:';
      expect(parseBulkKeyValue(text)).toEqual([
        { name: 'name', value: '', enabled: true }
      ]);
    });

    it('handles empty input', () => {
      expect(parseBulkKeyValue('')).toEqual([]);
      expect(parseBulkKeyValue(null)).toEqual([]);
      expect(parseBulkKeyValue(undefined)).toEqual([]);
    });
  });

  describe('round-trip', () => {
    it('preserves annotations through serialize → parse', () => {
      const original = [
        {
          name: 'Authorization',
          value: 'Bearer 123',
          enabled: true,
          description: 'auth token',
          annotations: [{ name: 'deprecated' }]
        },
        {
          name: 'Content-Type',
          value: 'application/json',
          enabled: false,
          description: ''
        }
      ];

      const serialized = serializeBulkKeyValue(original);
      const parsed = parseBulkKeyValue(serialized);

      expect(parsed).toEqual([
        {
          name: 'Authorization',
          value: 'Bearer 123',
          enabled: true,
          description: 'auth token',
          annotations: [
            { name: 'deprecated' },
            { name: 'description', value: 'auth token' }
          ]
        },
        {
          name: 'Content-Type',
          value: 'application/json',
          enabled: false
        }
      ]);
    });

    it('preserves generic non-description annotations round-trip', () => {
      const original = [
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          annotations: [{ name: 'version', value: '2' }, { name: 'deprecated' }]
        }
      ];

      const serialized = serializeBulkKeyValue(original);
      const parsed = parseBulkKeyValue(serialized);

      expect(parsed).toEqual(original);
    });

    it('preserves single-quoted description round-trip', () => {
      const original = [
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          description: 'O\'Reilly'
        }
      ];

      const serialized = serializeBulkKeyValue(original);
      const parsed = parseBulkKeyValue(serialized);

      expect(parsed).toEqual([
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          description: 'O\'Reilly',
          annotations: [{ name: 'description', value: 'O\'Reilly' }]
        }
      ]);
    });

    it('preserves backslash-escaped description round-trip', () => {
      const original = [
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          description: 'C:\\Users\\File'
        }
      ];

      const serialized = serializeBulkKeyValue(original);
      const parsed = parseBulkKeyValue(serialized);

      expect(parsed).toEqual([
        {
          name: 'X-Custom',
          value: 'val',
          enabled: true,
          description: 'C:\\Users\\File',
          annotations: [{ name: 'description', value: 'C:\\Users\\File' }]
        }
      ]);
    });
  });
});
