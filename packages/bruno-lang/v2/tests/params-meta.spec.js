const parser = require('../src/bruToJson');
const stringify = require('../src/jsonToBru');

describe('inline decorators in params', () => {
  describe('bruToJson parser', () => {
    it('parses query params with inline @choices decorator', () => {
      const input = `
params:query {
  status: active @choices("active", "inactive", "pending")
  environment: prod
}
`;

      const expected = {
        params: [
          {
            name: 'status',
            value: 'active',
            enabled: true,
            type: 'query',
            decorators: [{ type: 'choices', args: ['active', 'inactive', 'pending'] }]
          },
          { name: 'environment', value: 'prod', enabled: true, type: 'query' }
        ]
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });

    it('parses path params with inline decorator', () => {
      const input = `
params:path {
  userId: 123 @choices("123", "456", "789")
}
`;

      const expected = {
        params: [
          {
            name: 'userId',
            value: '123',
            enabled: true,
            type: 'path',
            decorators: [{ type: 'choices', args: ['123', '456', '789'] }]
          }
        ]
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });

    it('parses multiple inline decorators on same param', () => {
      const input = `
params:query {
  limit: 10 @choices("10", "25", "50") @required
}
`;

      const output = parser(input);
      expect(output.params[0].decorators).toHaveLength(2);
      expect(output.params[0].decorators[0].type).toBe('choices');
      expect(output.params[0].decorators[1].type).toBe('required');
      expect(output.params[0].value).toBe('10');
    });

    it('parses decorator without arguments', () => {
      const input = `
params:query {
  name: test @required
}
`;

      const output = parser(input);
      expect(output.params[0].decorators).toEqual([{ type: 'required', args: [] }]);
      expect(output.params[0].value).toBe('test');
    });

    it('parses decorator with empty arguments', () => {
      const input = `
params:query {
  name: test @optional()
}
`;

      const output = parser(input);
      expect(output.params[0].decorators).toEqual([{ type: 'optional', args: [] }]);
    });

    it('handles disabled params with decorators', () => {
      const input = `
params:query {
  ~status: disabled @choices("a", "b")
}
`;

      const output = parser(input);
      expect(output.params[0].enabled).toBe(false);
      expect(output.params[0].name).toBe('status');
      expect(output.params[0].value).toBe('disabled');
      expect(output.params[0].decorators).toHaveLength(1);
    });

    it('handles params without decorators', () => {
      const input = `
params:query {
  name: value
  other: test
}
`;

      const output = parser(input);
      expect(output.params[0].decorators).toBeUndefined();
      expect(output.params[1].decorators).toBeUndefined();
    });

    it('handles numeric args in decorators', () => {
      const input = `
params:query {
  page: 1 @range(1, 100)
}
`;

      const output = parser(input);
      expect(output.params[0].decorators[0].args).toEqual([1, 100]);
    });

    it('handles values containing @ that are not decorators', () => {
      const input = `
params:query {
  email: test@example.com
}
`;

      const output = parser(input);
      expect(output.params[0].value).toBe('test@example.com');
      expect(output.params[0].decorators).toBeUndefined();
    });
  });

  describe('jsonToBru stringify', () => {
    it('serializes query params with inline decorators', () => {
      const input = {
        params: [
          {
            name: 'status',
            value: 'active',
            enabled: true,
            type: 'query',
            decorators: [{ type: 'choices', args: ['active', 'inactive', 'pending'] }]
          }
        ]
      };

      const output = stringify(input);
      expect(output).toContain('params:query {');
      expect(output).toContain('status: active @choices("active", "inactive", "pending")');
      expect(output).not.toContain('params:query:meta');
    });

    it('serializes path params with inline decorators', () => {
      const input = {
        params: [
          {
            name: 'userId',
            value: '123',
            enabled: true,
            type: 'path',
            decorators: [{ type: 'choices', args: ['123', '456'] }]
          }
        ]
      };

      const output = stringify(input);
      expect(output).toContain('params:path {');
      expect(output).toContain('userId: 123 @choices("123", "456")');
    });

    it('serializes multiple decorators inline', () => {
      const input = {
        params: [
          {
            name: 'limit',
            value: '10',
            enabled: true,
            type: 'query',
            decorators: [
              { type: 'choices', args: ['10', '25', '50'] },
              { type: 'required', args: [] }
            ]
          }
        ]
      };

      const output = stringify(input);
      expect(output).toContain('limit: 10 @choices("10", "25", "50") @required');
    });

    it('serializes decorator without args correctly', () => {
      const input = {
        params: [
          {
            name: 'name',
            value: 'test',
            enabled: true,
            type: 'query',
            decorators: [{ type: 'required', args: [] }]
          }
        ]
      };

      const output = stringify(input);
      expect(output).toContain('name: test @required');
      expect(output).not.toContain('@required()');
    });

    it('does not add decorator syntax for params without decorators', () => {
      const input = {
        params: [{ name: 'status', value: 'active', enabled: true, type: 'query' }]
      };

      const output = stringify(input);
      expect(output).toContain('status: active');
      expect(output).not.toContain('@');
    });

    it('serializes disabled params with decorators', () => {
      const input = {
        params: [
          {
            name: 'status',
            value: 'disabled',
            enabled: false,
            type: 'query',
            decorators: [{ type: 'choices', args: ['a', 'b'] }]
          }
        ]
      };

      const output = stringify(input);
      expect(output).toContain('~status: disabled @choices("a", "b")');
    });
  });

  describe('round-trip (parse -> stringify -> parse)', () => {
    it('preserves inline decorators through round-trip', () => {
      const original = {
        params: [
          {
            name: 'status',
            value: 'active',
            enabled: true,
            type: 'query',
            decorators: [{ type: 'choices', args: ['active', 'inactive', 'pending'] }]
          },
          { name: 'env', value: 'prod', enabled: false, type: 'query' }
        ]
      };

      const bruString = stringify(original);
      const parsed = parser(bruString);

      expect(parsed.params[0].name).toBe('status');
      expect(parsed.params[0].value).toBe('active');
      expect(parsed.params[0].decorators).toEqual(original.params[0].decorators);
      expect(parsed.params[1].name).toBe('env');
      expect(parsed.params[1].decorators).toBeUndefined();
    });

    it('preserves path params decorators through round-trip', () => {
      const original = {
        params: [
          {
            name: 'id',
            value: '42',
            enabled: true,
            type: 'path',
            decorators: [{ type: 'choices', args: ['42', '100', '200'] }]
          }
        ]
      };

      const bruString = stringify(original);
      const parsed = parser(bruString);

      expect(parsed.params[0].decorators).toEqual(original.params[0].decorators);
    });

    it('preserves multiple decorators through round-trip', () => {
      const original = {
        params: [
          {
            name: 'limit',
            value: '10',
            enabled: true,
            type: 'query',
            decorators: [
              { type: 'choices', args: ['10', '25', '50'] },
              { type: 'required', args: [] }
            ]
          }
        ]
      };

      const bruString = stringify(original);
      const parsed = parser(bruString);

      expect(parsed.params[0].decorators).toHaveLength(2);
      expect(parsed.params[0].decorators[0].type).toBe('choices');
      expect(parsed.params[0].decorators[1].type).toBe('required');
    });

    it('preserves both query and path params with decorators through round-trip', () => {
      const original = {
        params: [
          {
            name: 'status',
            value: 'active',
            enabled: true,
            type: 'query',
            decorators: [{ type: 'choices', args: ['active', 'inactive'] }]
          },
          {
            name: 'userId',
            value: '123',
            enabled: true,
            type: 'path',
            decorators: [{ type: 'choices', args: ['123', '456'] }]
          }
        ]
      };

      const bruString = stringify(original);
      const parsed = parser(bruString);

      expect(parsed.params[0].decorators).toEqual(original.params[0].decorators);
      expect(parsed.params[1].decorators).toEqual(original.params[1].decorators);
    });
  });
});
