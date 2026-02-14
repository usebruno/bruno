const parser = require('../src/bruToJson');
const stringify = require('../src/jsonToBru');

describe('params:query:meta and params:path:meta', () => {
  describe('bruToJson parser', () => {
    it('parses params:query:meta block with decorator metadata', () => {
      const input = `
params:query {
  status: active
  environment: prod
}

params:query:meta {
  {
    "status": {
      "decorators": [
        { "type": "choices", "args": ["active", "inactive", "pending"] }
      ]
    }
  }
}
`;

      const expected = {
        params: [
          { name: 'status', value: 'active', enabled: true, type: 'query' },
          { name: 'environment', value: 'prod', enabled: true, type: 'query' }
        ],
        paramsMeta: {
          query: {
            status: {
              decorators: [{ type: 'choices', args: ['active', 'inactive', 'pending'] }]
            }
          }
        }
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });

    it('parses params:path:meta block with decorator metadata', () => {
      const input = `
params:path {
  userId: 123
}

params:path:meta {
  {
    "userId": {
      "decorators": [
        { "type": "choices", "args": ["123", "456", "789"] }
      ]
    }
  }
}
`;

      const expected = {
        params: [{ name: 'userId', value: '123', enabled: true, type: 'path' }],
        paramsMeta: {
          path: {
            userId: {
              decorators: [{ type: 'choices', args: ['123', '456', '789'] }]
            }
          }
        }
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });

    it('parses both query and path meta blocks together', () => {
      const input = `
params:query {
  status: active
}

params:query:meta {
  {
    "status": {
      "decorators": [{ "type": "choices", "args": ["active", "inactive"] }]
    }
  }
}

params:path {
  id: 1
}

params:path:meta {
  {
    "id": {
      "decorators": [{ "type": "choices", "args": ["1", "2", "3"] }]
    }
  }
}
`;

      const output = parser(input);
      expect(output.paramsMeta.query).toEqual({
        status: {
          decorators: [{ type: 'choices', args: ['active', 'inactive'] }]
        }
      });
      expect(output.paramsMeta.path).toEqual({
        id: {
          decorators: [{ type: 'choices', args: ['1', '2', '3'] }]
        }
      });
    });

    it('handles multiple decorators for a single param', () => {
      const input = `
params:query {
  limit: 10
}

params:query:meta {
  {
    "limit": {
      "decorators": [
        { "type": "choices", "args": ["10", "25", "50", "100"] },
        { "type": "validation", "args": ["numeric"] }
      ]
    }
  }
}
`;

      const output = parser(input);
      expect(output.paramsMeta.query.limit.decorators).toHaveLength(2);
      expect(output.paramsMeta.query.limit.decorators[0].type).toBe('choices');
      expect(output.paramsMeta.query.limit.decorators[1].type).toBe('validation');
    });

    it('handles empty or invalid meta JSON gracefully', () => {
      const input = `
params:query {
  status: active
}

params:query:meta {
  invalid json here
}
`;

      const output = parser(input);
      expect(output.params).toEqual([{ name: 'status', value: 'active', enabled: true, type: 'query' }]);
      expect(output.paramsMeta.query).toEqual({});
    });

    it('parses meta without params block', () => {
      const input = `
params:query:meta {
  {
    "status": {
      "decorators": [{ "type": "choices", "args": ["a", "b"] }]
    }
  }
}
`;

      const output = parser(input);
      expect(output.paramsMeta.query.status.decorators).toHaveLength(1);
    });
  });

  describe('jsonToBru stringify', () => {
    it('serializes params:query:meta block', () => {
      const input = {
        params: [{ name: 'status', value: 'active', enabled: true, type: 'query' }],
        paramsMeta: {
          query: {
            status: {
              decorators: [{ type: 'choices', args: ['active', 'inactive', 'pending'] }]
            }
          }
        }
      };

      const output = stringify(input);
      expect(output).toContain('params:query {');
      expect(output).toContain('status: active');
      expect(output).toContain('params:query:meta {');
      expect(output).toContain('"status"');
      expect(output).toContain('"decorators"');
      expect(output).toContain('"choices"');
    });

    it('serializes params:path:meta block', () => {
      const input = {
        params: [{ name: 'userId', value: '123', enabled: true, type: 'path' }],
        paramsMeta: {
          path: {
            userId: {
              decorators: [{ type: 'choices', args: ['123', '456'] }]
            }
          }
        }
      };

      const output = stringify(input);
      expect(output).toContain('params:path {');
      expect(output).toContain('userId: 123');
      expect(output).toContain('params:path:meta {');
      expect(output).toContain('"userId"');
    });

    it('does not serialize meta block when paramsMeta is empty', () => {
      const input = {
        params: [{ name: 'status', value: 'active', enabled: true, type: 'query' }]
      };

      const output = stringify(input);
      expect(output).toContain('params:query {');
      expect(output).not.toContain('params:query:meta');
    });

    it('does not serialize meta block when paramsMeta.query is empty object', () => {
      const input = {
        params: [{ name: 'status', value: 'active', enabled: true, type: 'query' }],
        paramsMeta: {
          query: {}
        }
      };

      const output = stringify(input);
      expect(output).not.toContain('params:query:meta');
    });
  });

  describe('round-trip (parse -> stringify -> parse)', () => {
    it('preserves params:query:meta through round-trip', () => {
      const original = {
        params: [
          { name: 'status', value: 'active', enabled: true, type: 'query' },
          { name: 'env', value: 'prod', enabled: false, type: 'query' }
        ],
        paramsMeta: {
          query: {
            status: {
              decorators: [{ type: 'choices', args: ['active', 'inactive', 'pending'] }]
            }
          }
        }
      };

      const bruString = stringify(original);
      const parsed = parser(bruString);

      expect(parsed.params).toEqual(original.params);
      expect(parsed.paramsMeta.query).toEqual(original.paramsMeta.query);
    });

    it('preserves params:path:meta through round-trip', () => {
      const original = {
        params: [{ name: 'id', value: '42', enabled: true, type: 'path' }],
        paramsMeta: {
          path: {
            id: {
              decorators: [{ type: 'choices', args: ['42', '100', '200'] }]
            }
          }
        }
      };

      const bruString = stringify(original);
      const parsed = parser(bruString);

      expect(parsed.params).toEqual(original.params);
      expect(parsed.paramsMeta.path).toEqual(original.paramsMeta.path);
    });

    it('preserves both query and path meta through round-trip', () => {
      const original = {
        params: [
          { name: 'status', value: 'active', enabled: true, type: 'query' },
          { name: 'userId', value: '123', enabled: true, type: 'path' }
        ],
        paramsMeta: {
          query: {
            status: {
              decorators: [{ type: 'choices', args: ['active', 'inactive'] }]
            }
          },
          path: {
            userId: {
              decorators: [{ type: 'choices', args: ['123', '456'] }]
            }
          }
        }
      };

      const bruString = stringify(original);
      const parsed = parser(bruString);

      expect(parsed.paramsMeta.query).toEqual(original.paramsMeta.query);
      expect(parsed.paramsMeta.path).toEqual(original.paramsMeta.path);
    });
  });
});
