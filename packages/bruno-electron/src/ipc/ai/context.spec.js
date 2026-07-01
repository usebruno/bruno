const {
  isSensitiveName,
  maskValue,
  redactResponseValues,
  formatResponseShape,
  formatRequestContext,
  formatVariablesList,
  searchVariables,
  formatSearchVariablesResult
} = require('./context');

describe('ipc/ai/context', () => {
  describe('isSensitiveName', () => {
    it.each([
      ['Authorization'],
      ['Cookie'],
      ['X-API-Key'],
      ['api_key'],
      ['accessToken'],
      ['refresh_token'],
      ['id_token'],
      ['csrfToken'],
      ['TOKEN'],
      ['client_secret'],
      ['password']
    ])('flags %s as sensitive', (name) => {
      expect(isSensitiveName(name)).toBe(true);
    });

    it.each([
      ['X-Trace-Id'],
      ['Content-Type'],
      ['User-Agent'],
      ['email']
    ])('does not flag %s', (name) => {
      expect(isSensitiveName(name)).toBe(false);
    });
  });

  describe('maskValue', () => {
    it('redacts the value when the name is sensitive', () => {
      expect(maskValue('Authorization', 'Bearer abc')).toBe('<redacted>');
    });
    it('passes the value through when the name is not sensitive', () => {
      expect(maskValue('X-Trace-Id', '123')).toBe('123');
    });
  });

  describe('redactResponseValues', () => {
    it('replaces primitives with type placeholders, preserving keys', () => {
      expect(redactResponseValues({ id: 1, name: 'a', active: true })).toEqual({
        id: '<number>',
        name: '<string>',
        active: '<boolean>'
      });
    });

    it('samples long arrays and reports the rest', () => {
      const out = redactResponseValues([1, 2, 3, 4, 5]);
      expect(out).toEqual(['<number>', '<number>', '<number>', '<2 more items>']);
    });

    it('caps deep nesting with a placeholder', () => {
      // 8 levels deep — exceeds the default maxDepth of 6.
      const deep = { a: { b: { c: { d: { e: { f: { g: { h: 'leaf' } } } } } } } };
      const out = redactResponseValues(deep);
      expect(JSON.stringify(out)).toContain('<truncated>');
    });
  });

  describe('formatResponseShape', () => {
    it('returns an empty string when neither status nor data is present', () => {
      expect(formatResponseShape(null, null)).toBe('');
    });

    it('parses a JSON string body and emits a redacted shape block', () => {
      const out = formatResponseShape(200, JSON.stringify({ user: { id: 1, email: 'a@b' } }));
      expect(out).toContain('**Last Response Status:** 200');
      expect(out).toContain('"id": "<number>"');
      expect(out).toContain('"email": "<string>"');
      // Real values must not leak.
      expect(out).not.toContain('a@b');
    });

    it('summarizes non-JSON string bodies without echoing them', () => {
      const out = formatResponseShape(200, 'plain text body');
      expect(out).toContain('non-JSON');
      expect(out).not.toContain('plain text body');
    });
  });

  describe('formatRequestContext', () => {
    it('masks sensitive header / param values', () => {
      const out = formatRequestContext({
        method: 'GET',
        url: '/x',
        headers: [
          { name: 'Authorization', value: 'Bearer xyz', enabled: true },
          { name: 'X-Trace-Id', value: '123', enabled: true }
        ],
        params: [{ name: 'api_key', value: 'secret-key', enabled: true, type: 'query' }],
        body: null
      });
      expect(out).toContain('Authorization: <redacted>');
      expect(out).toContain('X-Trace-Id: 123');
      expect(out).toContain('api_key: <redacted>');
      expect(out).not.toContain('Bearer xyz');
      expect(out).not.toContain('secret-key');
    });

    it('redacts the full subtree under a sensitive key (not just direct primitives)', () => {
      const out = formatRequestContext({
        method: 'POST',
        url: '/x',
        headers: [],
        params: [],
        body: {
          mode: 'json',
          json: JSON.stringify({
            password: { value: 'hunter2', hint: 'first pet' },
            data: { safe: 'ok' }
          })
        }
      });
      expect(out).toContain('"password": "<redacted>"');
      expect(out).not.toContain('hunter2');
      expect(out).not.toContain('first pet');
      expect(out).toContain('"safe": "ok"');
    });

    it('masks formUrlEncoded values based on redactBody, not redactHeaders', () => {
      const ctx = {
        method: 'POST',
        url: '/login',
        headers: [],
        params: [],
        body: {
          mode: 'formUrlEncoded',
          formUrlEncoded: [
            { name: 'username', value: 'alice', enabled: true },
            { name: 'password', value: 'hunter2', enabled: true }
          ]
        }
      };
      // Headers-only off + body on: form field values still masked.
      const bodyOn = formatRequestContext(ctx, { security: { redactHeaders: false, redactBody: true } });
      expect(bodyOn).toContain('password: <redacted>');
      expect(bodyOn).not.toContain('hunter2');

      // Body off: raw values pass through even if headers still redacted.
      const bodyOff = formatRequestContext(ctx, { security: { redactHeaders: true, redactBody: false } });
      expect(bodyOff).toContain('password: hunter2');
    });

    it('redacts sensitive keys inside JSON bodies but keeps the shape', () => {
      const out = formatRequestContext({
        method: 'POST',
        url: '/login',
        headers: [],
        params: [],
        body: {
          mode: 'json',
          json: JSON.stringify({
            username: 'alice',
            password: 'hunter2',
            nested: { refresh_token: 'tok', safe: 'ok' }
          })
        }
      });
      expect(out).toContain('"username": "alice"');
      expect(out).toContain('"password": "<redacted>"');
      expect(out).toContain('"refresh_token": "<redacted>"');
      expect(out).toContain('"safe": "ok"');
      expect(out).not.toContain('hunter2');
      expect(out).not.toContain('"tok"');
    });

    it('redacts sensitive keys inside GraphQL variables JSON', () => {
      const out = formatRequestContext({
        method: 'POST',
        url: '/g',
        headers: [],
        params: [],
        body: {
          mode: 'graphql',
          graphql: { query: 'mutation X', variables: '{"token": "abc", "id": 1}' }
        }
      });
      expect(out).toContain('"token": "<redacted>"');
      expect(out).toContain('"id": 1');
      expect(out).not.toContain('"abc"');
    });

    it('includes the response shape only when opts.includeResponse is true', () => {
      const base = {
        method: 'GET',
        url: '/x',
        headers: [],
        params: [],
        body: null,
        responseStatus: 200,
        responseData: { id: 1 }
      };
      expect(formatRequestContext(base)).not.toContain('Response Shape');
      expect(formatRequestContext(base, { includeResponse: true })).toContain('Response Shape');
    });

    it('truncates the body when bodyMaxChars is set', () => {
      const long = 'x'.repeat(1000);
      const out = formatRequestContext(
        { method: 'GET', url: '/x', headers: [], params: [], body: { mode: 'text', text: long } },
        { bodyMaxChars: 50 }
      );
      // The shown body should be 50 chars plus the ellipsis marker.
      expect(out).toContain('…');
      expect(out).not.toContain('x'.repeat(60));
    });

    it('leaves sensitive header/body values intact when security toggles are off', () => {
      const out = formatRequestContext({
        method: 'POST',
        url: '/x',
        headers: [{ name: 'Authorization', value: 'Bearer xyz', enabled: true }],
        params: [],
        body: { mode: 'json', json: JSON.stringify({ password: 'hunter2' }) }
      }, { security: { redactHeaders: false, redactBody: false } });
      expect(out).toContain('Authorization: Bearer xyz');
      expect(out).toContain('hunter2');
      expect(out).not.toContain('<redacted>');
    });

    it('honors customRedactedHeaders for a user-added header name', () => {
      const out = formatRequestContext({
        method: 'GET',
        url: '/x',
        headers: [{ name: 'X-Trace-Id', value: 'trace-abc', enabled: true }],
        params: [],
        body: null
      }, { security: { customRedactedHeaders: ['X-Trace-Id'] } });
      expect(out).toContain('X-Trace-Id: <redacted>');
      expect(out).not.toContain('trace-abc');
    });

    it('sends the raw response body when redactResponse is off', () => {
      const base = {
        method: 'GET',
        url: '/x',
        headers: [],
        params: [],
        body: null,
        responseStatus: 200,
        responseData: { user: { id: 42, email: 'a@b' } }
      };
      const redacted = formatRequestContext(base, { includeResponse: true });
      expect(redacted).toContain('Response Shape');
      expect(redacted).not.toContain('a@b');

      const raw = formatRequestContext(base, {
        includeResponse: true,
        security: { redactResponse: false }
      });
      expect(raw).toContain('Response Body');
      expect(raw).toContain('"email": "a@b"');
    });
  });

  describe('formatVariablesList', () => {
    it('groups by scope and tags secret entries', () => {
      const out = formatVariablesList([
        { name: 'API_URL', value: 'u', scope: 'env', secret: false },
        { name: 'API_TOKEN', value: '<redacted>', scope: 'env', secret: true },
        { name: 'runtimeKey', value: 'r', scope: 'runtime', secret: false }
      ]);
      expect(out).toContain('env (2)');
      expect(out).toContain('API_TOKEN (secret)');
      expect(out).toContain('runtime (1)');
      expect(out).toContain('runtimeKey');
    });

    it('returns an empty string for no variables', () => {
      expect(formatVariablesList([])).toBe('');
      expect(formatVariablesList(null)).toBe('');
    });

    it('drops the (secret) tag from name-pattern matches when redactVariables is off', () => {
      const out = formatVariablesList([
        { name: 'API_TOKEN', value: 'v', scope: 'env', secret: false }
      ], { security: { redactVariables: false } });
      expect(out).not.toContain('(secret)');
    });

    it('always tags variables in customRedactedVariables as secret, even when redactVariables is off', () => {
      const out = formatVariablesList([
        { name: 'MY_SESSION', value: 'v', scope: 'env', secret: false }
      ], { security: { redactVariables: false, customRedactedVariables: ['MY_SESSION'] } });
      expect(out).toContain('MY_SESSION (secret)');
    });

    it('keeps secret: true variables tagged even with all toggles off', () => {
      const out = formatVariablesList([
        { name: 'plain_name', value: '<redacted>', scope: 'env', secret: true }
      ], { security: { redactVariables: false } });
      expect(out).toContain('plain_name (secret)');
    });
  });

  describe('searchVariables / formatSearchVariablesResult', () => {
    const vars = [
      { name: 'API_URL', value: 'https://x', scope: 'env', secret: false },
      { name: 'API_TOKEN', value: '<redacted>', scope: 'env', secret: true },
      { name: 'runtimeKey', value: 'r1', scope: 'runtime', secret: false }
    ];

    it('returns case-insensitive substring matches with a totalMatched count', () => {
      const r = searchVariables(vars, 'api');
      expect(r.items.map((v) => v.name)).toEqual(['API_URL', 'API_TOKEN']);
      expect(r.totalMatched).toBe(2);
    });

    it('returns all entries (up to the limit) for an empty query', () => {
      const r = searchVariables(vars, '');
      expect(r.items).toHaveLength(3);
      expect(r.totalMatched).toBe(3);
    });

    it('truncates to the limit and reports the surplus in totalMatched', () => {
      const many = Array.from({ length: 60 }, (_, i) => ({
        name: 'token_' + i, value: 'v' + i, scope: 'env', secret: false
      }));
      const r = searchVariables(many, 'token', 50);
      expect(r.items).toHaveLength(50);
      expect(r.totalMatched).toBe(60);
    });

    it('formats matches with scope + secret tags', () => {
      const out = formatSearchVariablesResult(searchVariables(vars, 'api'), 'api');
      expect(out).toContain('API_URL = https://x    [env]');
      expect(out).toContain('API_TOKEN = <redacted>    [env, secret]');
    });

    it('says "no matches" when nothing matched the query', () => {
      expect(formatSearchVariablesResult(searchVariables(vars, 'zzz'), 'zzz'))
        .toBe('No variables match "zzz".');
    });

    it('includes a trailer when limit was hit', () => {
      const many = Array.from({ length: 60 }, (_, i) => ({
        name: 'token_' + i, value: 'v' + i, scope: 'env', secret: false
      }));
      const out = formatSearchVariablesResult(searchVariables(many, 'token', 50), 'token');
      expect(out).toContain('Found 50 of 60');
      expect(out).toContain('(10 more match');
    });
  });
});
