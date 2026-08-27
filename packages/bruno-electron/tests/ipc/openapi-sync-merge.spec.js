/**
 * Tests for openapi-sync merge helpers (Batch A: Tasks 1-4).
 * Run: cd packages/bruno-electron && npx jest tests/ipc/openapi-sync-merge.spec.js
 */
const { describe, it, expect, beforeAll } = require('@jest/globals');

process.env.NODE_ENV = 'test';

const syncModule = require('../../src/ipc/openapi-sync');
let helpers;

beforeAll(() => {
  helpers = syncModule._test;
});

// ---------------------------------------------------------------------------
// Task 1: Smoke — each exported helper is a function
// ---------------------------------------------------------------------------
describe('_test exports', () => {
  it('exports maskJsonInterpolations as a function', () => {
    expect(typeof helpers.maskJsonInterpolations).toBe('function');
  });

  it('exports unmaskJsonInterpolations as a function', () => {
    expect(typeof helpers.unmaskJsonInterpolations).toBe('function');
  });

  it('exports mergeJsonValues as a function', () => {
    expect(typeof helpers.mergeJsonValues).toBe('function');
  });

  it('exports mergeJsonBody as a function', () => {
    expect(typeof helpers.mergeJsonBody).toBe('function');
  });

  it('exports mergeSpecIntoRequest as a function', () => {
    expect(typeof helpers.mergeSpecIntoRequest).toBe('function');
  });

  it('exports compareRequestFields as a function', () => {
    expect(typeof helpers.compareRequestFields).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Task 2: maskJsonInterpolations / unmaskJsonInterpolations
// ---------------------------------------------------------------------------
describe('maskJsonInterpolations', () => {
  it('quotes a bare-value variable so result parses as JSON', () => {
    const { masked, vars } = helpers.maskJsonInterpolations('{"id": {{userId}}}');
    expect(() => JSON.parse(masked)).not.toThrow();
    expect(vars).toEqual(['{{userId}}']);
  });

  it('leaves an in-string variable unquoted (bearer prefix preserved)', () => {
    const { masked } = helpers.maskJsonInterpolations('{"auth": "Bearer {{token}}"}');
    const parsed = JSON.parse(masked);
    expect(parsed.auth).toMatch(/^Bearer /);
  });

  it('round-trips bare and in-string vars', () => {
    const src = '{"id": {{userId}}, "auth": "Bearer {{token}}"}';
    const { masked, vars } = helpers.maskJsonInterpolations(src);
    const roundTripped = helpers.unmaskJsonInterpolations(JSON.stringify(JSON.parse(masked)), vars);
    expect(roundTripped).toContain('{{userId}}');
    expect(roundTripped).toContain('Bearer {{token}}');
    expect(roundTripped).toMatch(/"id":\s*{{userId}}/);
  });

  it('handles a string value ending with a backslash (escaped quote disambiguation)', () => {
    const src = '{"path": "C:\\\\", "id": {{userId}}}';
    const { masked, vars } = helpers.maskJsonInterpolations(src);
    expect(() => JSON.parse(masked)).not.toThrow();
    expect(vars).toEqual(['{{userId}}']);
  });

  // Round-trip helper: mask -> parse -> stringify -> unmask, then assert the
  // result is still valid once vars are stubbed out (catches eaten delimiters).
  const roundTrip = (src) => {
    const { masked, vars } = helpers.maskJsonInterpolations(src);
    const restored = helpers.unmaskJsonInterpolations(JSON.stringify(JSON.parse(masked), null, 2), vars);
    return restored;
  };
  const isValidWithVarsStubbed = (json) => {
    try {
      JSON.parse(json.replace(/\{\{[^}]+\}\}/g, '1')); return true;
    } catch (e) { return false; }
  };

  it('keeps the closing quote when a var is at the END of a string value', () => {
    const out = roundTrip('{"auth": "Bearer {{token}}"}');
    expect(out).toContain('"Bearer {{token}}"');
    expect(isValidWithVarsStubbed(out)).toBe(true);
  });

  it('keeps quotes when a var is the ENTIRE string value', () => {
    const out = roundTrip('{"tok": "{{token}}"}');
    expect(out).toContain('"{{token}}"');
    expect(isValidWithVarsStubbed(out)).toBe(true);
  });

  it('keeps a bare-value var unquoted', () => {
    const out = roundTrip('{"id": {{userId}}}');
    expect(out).toMatch(/"id":\s*{{userId}}/);
    expect(isValidWithVarsStubbed(out)).toBe(true);
  });

  it('preserves a var used as an object key', () => {
    const out = roundTrip('{"{{dynKey}}": "v"}');
    expect(out).toContain('"{{dynKey}}"');
    expect(isValidWithVarsStubbed(out)).toBe(true);
  });

  it('does not corrupt a body literal that resembles the internal sentinel', () => {
    // Both the legacy shape and the current tagged shape must pass through untouched —
    // the real sentinel is wrapped in a U+E000 delimiter the user cannot type.
    const out = roundTrip('{"msg": "__BRUNO_VAR_0__ and __BRUNO_VAR_S_0__ literal", "id": {{userId}}}');
    expect(out).toContain('__BRUNO_VAR_0__ and __BRUNO_VAR_S_0__ literal');
    expect(out).toContain('{{userId}}');
    expect(isValidWithVarsStubbed(out)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 3: mergeJsonValues
// ---------------------------------------------------------------------------
describe('mergeJsonValues', () => {
  it('keeps user value for shared key', () => {
    expect(helpers.mergeJsonValues({ id: 10 }, { id: 0 }, true)).toEqual({ id: 10 });
  });

  it('adds key spec introduces', () => {
    expect(helpers.mergeJsonValues({ id: 10 }, { id: 0, name: '' }, true)).toEqual({ id: 10, name: '' });
  });

  it('removes key spec dropped', () => {
    expect(helpers.mergeJsonValues({ id: 10, old: 'x' }, { id: 0 }, true)).toEqual({ id: 10 });
  });

  it('merges nested objects', () => {
    expect(
      helpers.mergeJsonValues({ addr: { city: 'NYC', zip: '1' } }, { addr: { city: '', country: '' } }, true)
    ).toEqual({ addr: { city: 'NYC', country: '' } });
  });

  it('array element shape vs template keeping user values', () => {
    expect(
      helpers.mergeJsonValues(
        { items: [{ id: 1, gone: true }, { id: 2, gone: true }] },
        { items: [{ id: 0, qty: 0 }] },
        true
      )
    ).toEqual({ items: [{ id: 1, qty: 0 }, { id: 2, qty: 0 }] });
  });

  it('empty user array uses spec template', () => {
    expect(helpers.mergeJsonValues({ items: [] }, { items: [{ id: 0 }] }, true)).toEqual({
      items: [{ id: 0 }]
    });
  });

  it('keeps a user array of primitives as-is against a single-element template', () => {
    expect(helpers.mergeJsonValues({ tags: [1, 2, 3] }, { tags: [0] }, true)).toEqual({ tags: [1, 2, 3] });
  });

  it('preserveValues=false takes spec', () => {
    expect(helpers.mergeJsonValues({ id: 10 }, { id: 0, name: '' }, false)).toEqual({ id: 0, name: '' });
  });
});

// ---------------------------------------------------------------------------
// Task 4: mergeJsonBody
// ---------------------------------------------------------------------------
describe('mergeJsonBody', () => {
  it('preserves user field values, adds new, drops removed', () => {
    const userBody = { mode: 'json', json: '{"id":10,"old":"x"}' };
    const specBody = { mode: 'json', json: '{"id":0,"name":""}' };
    const merged = helpers.mergeJsonBody(userBody, specBody, true);
    expect(JSON.parse(merged.json)).toEqual({ id: 10, name: '' });
  });

  it('preserves {{envVar}} references', () => {
    const userBody = { mode: 'json', json: '{"id": {{userId}}, "tok": "Bearer {{t}}"}' };
    const specBody = { mode: 'json', json: '{"id": 0, "tok": "", "extra": 1}' };
    const merged = helpers.mergeJsonBody(userBody, specBody, true);
    expect(merged.json).toContain('{{userId}}');
    expect(merged.json).toContain('"Bearer {{t}}"'); // quotes intact around the in-string var
    expect(merged.json).toContain('extra');
    // result must stay structurally valid JSON once vars are stubbed
    expect(() => JSON.parse(merged.json.replace(/\{\{[^}]+\}\}/g, '1'))).not.toThrow();
  });

  it('unparseable user json falls back verbatim', () => {
    const userBody = { mode: 'json', json: '{ not valid json' };
    const specBody = { mode: 'json', json: '{"id":0}' };
    const merged = helpers.mergeJsonBody(userBody, specBody, true);
    expect(merged.json).toBe('{ not valid json');
  });

  it('preserveValues=false returns spec body', () => {
    const userBody = { mode: 'json', json: '{"id":10}' };
    const specBody = { mode: 'json', json: '{"id":0,"name":""}' };
    const merged = helpers.mergeJsonBody(userBody, specBody, false);
    expect(merged).toBe(specBody);
  });
});

// ---------------------------------------------------------------------------
// Task 5 smoke: _test exports new helpers
// ---------------------------------------------------------------------------
describe('_test exports (Batch B)', () => {
  it('exports mergeFieldListPreserving as a function', () => {
    expect(typeof helpers.mergeFieldListPreserving).toBe('function');
  });

  it('exports mergeAuth as a function', () => {
    expect(typeof helpers.mergeAuth).toBe('function');
  });

  it('exports mergeBody as a function', () => {
    expect(typeof helpers.mergeBody).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Task 5: mergeFieldListPreserving
// ---------------------------------------------------------------------------
describe('mergeFieldListPreserving', () => {
  it('keeps user value+enabled for matching name', () => {
    const spec = [{ name: 'q', value: '', enabled: true }];
    const user = [{ name: 'q', value: 'hello', enabled: false }];
    const out = helpers.mergeFieldListPreserving(spec, user);
    expect(out).toEqual([{ name: 'q', value: 'hello', enabled: false }]);
  });

  it('adds spec entries user lacks', () => {
    const spec = [{ name: 'q', value: '' }, { name: 'page', value: '1' }];
    const user = [{ name: 'q', value: 'hi' }];
    const out = helpers.mergeFieldListPreserving(spec, user);
    expect(out.map((e) => e.name)).toEqual(['q', 'page']);
    expect(out[1].value).toBe('1');
  });

  it('drops user entries not in spec', () => {
    const spec = [{ name: 'q', value: '' }];
    const user = [{ name: 'q', value: 'hi' }, { name: 'gone', value: 'x' }];
    const out = helpers.mergeFieldListPreserving(spec, user);
    expect(out.map((e) => e.name)).toEqual(['q']);
  });

  it('pairs duplicate names positionally', () => {
    const spec = [{ name: 'X', value: '' }, { name: 'X', value: '' }];
    const user = [{ name: 'X', value: 'a' }, { name: 'X', value: 'b' }];
    const out = helpers.mergeFieldListPreserving(spec, user);
    expect(out.map((e) => e.value)).toEqual(['a', 'b']);
  });

  it('preserves multipart file value (array) by name', () => {
    const spec = [{ name: 'f', type: 'file', value: [] }];
    const user = [{ name: 'f', type: 'file', value: ['/tmp/a.png'], enabled: true }];
    const out = helpers.mergeFieldListPreserving(spec, user);
    expect(out[0].value).toEqual(['/tmp/a.png']);
  });

  it('preserveValues=false returns spec entries unchanged', () => {
    const spec = [{ name: 'q', value: '' }];
    const user = [{ name: 'q', value: 'hi' }];
    const out = helpers.mergeFieldListPreserving(spec, user, false);
    expect(out).toEqual(spec);
  });

  it('falls back to the spec enabled default when the user entry has no enabled flag', () => {
    const spec = [{ name: 'q', value: '', enabled: true }];
    const user = [{ name: 'q', value: 'hi' }];
    const out = helpers.mergeFieldListPreserving(spec, user);
    expect(out[0].enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 6: mergeAuth
// ---------------------------------------------------------------------------
describe('mergeAuth', () => {
  it('preserves user auth values when mode matches', () => {
    const user = { mode: 'oauth2', oauth2: { accessTokenUrl: '{{url}}', scope: 'read' } };
    const spec = { mode: 'oauth2', oauth2: { accessTokenUrl: 'https://x', scope: '' } };
    const out = helpers.mergeAuth(user, spec);
    expect(out).toEqual({ mode: 'oauth2', oauth2: { accessTokenUrl: '{{url}}', scope: 'read' } });
  });

  it('takes spec auth when mode differs', () => {
    const user = { mode: 'apikey', apikey: { key: 'X' } };
    const spec = { mode: 'oauth2', oauth2: { scope: 'read' } };
    const out = helpers.mergeAuth(user, spec);
    expect(out).toEqual(spec);
  });

  it('takes spec auth for none/inherit', () => {
    const out = helpers.mergeAuth({ mode: 'inherit' }, { mode: 'inherit' }, true);
    expect(out).toEqual({ mode: 'inherit' });
  });

  it('preserveValues=false takes spec', () => {
    const user = { mode: 'oauth2', oauth2: { scope: 'read' } };
    const spec = { mode: 'oauth2', oauth2: { scope: '' } };
    const out = helpers.mergeAuth(user, spec, false);
    expect(out).toEqual(spec);
  });

  it('does not alias the user auth sub-object (defensive clone)', () => {
    const user = { mode: 'oauth2', oauth2: { scope: 'read' } };
    const spec = { mode: 'oauth2', oauth2: { scope: '' } };
    const out = helpers.mergeAuth(user, spec);
    expect(out.oauth2).not.toBe(user.oauth2);
  });

  it('falls back to spec when the user sub-object is null (not just undefined)', () => {
    const user = { mode: 'oauth2', oauth2: null };
    const spec = { mode: 'oauth2', oauth2: { accessTokenUrl: 'https://x', scope: 'read' } };
    const out = helpers.mergeAuth(user, spec);
    expect(out).toEqual(spec);
  });

  it('ON: adds spec-introduced auth fields, keeps user values + user-only fields', () => {
    const user = { mode: 'oauth2', oauth2: { scope: 'read:pet', callbackUrl: '{{cb}}', clientSecret: '{{secret}}' } };
    const spec = { mode: 'oauth2', oauth2: { scope: 'read:pets', authorizationUrl: 'https://x/v1', refreshTokenUrl: '{{rt}}' } };
    const out = helpers.mergeAuth(user, spec).oauth2;
    expect(out.scope).toBe('read:pet'); // user value wins on shared field
    expect(out.authorizationUrl).toBe('https://x/v1'); // spec-added field appears
    expect(out.refreshTokenUrl).toBe('{{rt}}'); // spec-added field appears
    expect(out.callbackUrl).toBe('{{cb}}'); // user-only field kept (not deleted)
    expect(out.clientSecret).toBe('{{secret}}'); // user credential kept
  });

  it('ON: does NOT delete a user field the spec dropped (no-delete safety)', () => {
    const user = { mode: 'oauth2', oauth2: { scope: 'read', callbackUrl: '{{cb}}' } };
    const spec = { mode: 'oauth2', oauth2: { scope: 'read' } }; // spec has no callbackUrl
    expect(helpers.mergeAuth(user, spec).oauth2.callbackUrl).toBe('{{cb}}');
  });

  it('OFF: full spec overwrite drops user-only fields (removals applied)', () => {
    const user = { mode: 'oauth2', oauth2: { scope: 'read:pet', callbackUrl: '{{cb}}', clientSecret: '{{secret}}' } };
    const spec = { mode: 'oauth2', oauth2: { scope: 'read:pets', authorizationUrl: 'https://x/v1' } };
    const out = helpers.mergeAuth(user, spec, false).oauth2;
    expect(out).toEqual({ scope: 'read:pets', authorizationUrl: 'https://x/v1' });
    expect(out.callbackUrl).toBeUndefined(); // removed under overwrite
  });
});

// ---------------------------------------------------------------------------
// Task 6: mergeBody
// ---------------------------------------------------------------------------
describe('mergeBody', () => {
  it('dispatches json bodies to field-level merge', () => {
    const user = { mode: 'json', json: '{"id":10}' };
    const spec = { mode: 'json', json: '{"id":0,"name":""}' };
    const out = helpers.mergeBody(user, spec);
    expect(JSON.parse(out.json)).toEqual({ id: 10, name: '' });
  });

  it('merges formUrlEncoded by name', () => {
    const user = { mode: 'formUrlEncoded', formUrlEncoded: [{ name: 'a', value: 'mine' }] };
    const spec = { mode: 'formUrlEncoded', formUrlEncoded: [{ name: 'a', value: '' }, { name: 'b', value: '' }] };
    const out = helpers.mergeBody(user, spec);
    expect(out.formUrlEncoded.find((e) => e.name === 'a').value).toBe('mine');
    expect(out.formUrlEncoded.map((e) => e.name)).toEqual(['a', 'b']);
  });

  it('keeps user raw body verbatim for matching text/xml modes', () => {
    const user = { mode: 'xml', xml: '<a>{{v}}</a>' };
    const spec = { mode: 'xml', xml: '<a></a>' };
    const out = helpers.mergeBody(user, spec);
    expect(out).toEqual(user);
  });

  it('takes spec body when body mode differs', () => {
    const user = { mode: 'json', json: '{"id":10}' };
    const spec = { mode: 'formUrlEncoded', formUrlEncoded: [] };
    const out = helpers.mergeBody(user, spec);
    expect(out).toEqual(spec);
  });

  it('keeps the user graphql body but does not alias its nested object', () => {
    const user = { mode: 'graphql', graphql: { query: '{ me {{id}} }', variables: '{}' } };
    const spec = { mode: 'graphql', graphql: { query: '{ me }', variables: '' } };
    const out = helpers.mergeBody(user, spec);
    expect(out.graphql).toEqual(user.graphql);
    expect(out.graphql).not.toBe(user.graphql);
  });

  it('falls back to the spec graphql body when the user has none', () => {
    const user = { mode: 'graphql' }; // no graphql sub-object
    const spec = { mode: 'graphql', graphql: { query: '{ me }', variables: '' } };
    const out = helpers.mergeBody(user, spec);
    expect(out.graphql).toEqual(spec.graphql);
  });
});

// ---------------------------------------------------------------------------
// Task 7: mergeSpecIntoRequest (sync mode)
// ---------------------------------------------------------------------------
describe('mergeSpecIntoRequest (sync mode)', () => {
  const existing = {
    name: 'r', type: 'http-request',
    request: {
      method: 'post', url: '{{old}}/x',
      params: [{ name: 'q', value: 'mine', enabled: true }],
      headers: [{ name: 'H', value: 'mine', enabled: true }],
      body: { mode: 'json', json: '{"id":10}' },
      auth: { mode: 'oauth2', oauth2: { scope: 'read' } },
      script: { req: 'console.log(1)' }, tests: 'expect(1)', assertions: [{ k: 'a' }]
    }
  };
  const specItem = {
    name: 'r', type: 'http-request',
    request: {
      method: 'post', url: '{{spec}}/x',
      params: [{ name: 'q', value: '', enabled: true }, { name: 'p', value: '', enabled: true }],
      headers: [{ name: 'H', value: '', enabled: true }],
      body: { mode: 'json', json: '{"id":0,"name":""}' },
      auth: { mode: 'oauth2', oauth2: { scope: '' } }
    }
  };

  it('url always follows the spec (Option A)', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem);
    expect(out.request.url).toBe('{{spec}}/x');
  });

  it('body: merges user json values into spec structure', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem);
    expect(JSON.parse(out.request.body.json)).toEqual({ id: 10, name: '' });
  });

  it('params: preserves user value for existing param, adds new param from spec', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem);
    const q = out.request.params.find((p) => p.name === 'q');
    expect(q.value).toBe('mine');
    expect(out.request.params.map((p) => p.name)).toEqual(['q', 'p']);
  });

  it('headers: preserves user value for an existing header', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem);
    const h = out.request.headers.find((x) => x.name === 'H');
    expect(h.value).toBe('mine');
  });

  it('auth: preserves user auth values when mode matches', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem);
    expect(out.request.auth.oauth2.scope).toBe('read');
  });

  it('body: spec wins when the body mode changed (json -> formUrlEncoded)', () => {
    const specFormItem = {
      ...specItem,
      request: { ...specItem.request, body: { mode: 'formUrlEncoded', formUrlEncoded: [{ name: 'a', value: '' }] } }
    };
    const out = helpers.mergeSpecIntoRequest(existing, specFormItem);
    expect(out.request.body.mode).toBe('formUrlEncoded');
    expect(out.request.body.formUrlEncoded.map((e) => e.name)).toEqual(['a']);
  });

  it('preserves script, tests, and assertions unchanged', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem);
    expect(out.request.script).toEqual({ req: 'console.log(1)' });
    expect(out.request.tests).toBe('expect(1)');
    expect(out.request.assertions).toEqual([{ k: 'a' }]);
  });

  it('with preserveValues=false: body comes from spec', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem, { preserveValues: false });
    expect(JSON.parse(out.request.body.json)).toEqual({ id: 0, name: '' });
  });

  it('with preserveValues=false: param values come from spec', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem, { preserveValues: false });
    const q = out.request.params.find((p) => p.name === 'q');
    expect(q.value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Task 7: mergeSpecIntoRequest (reset mode unchanged)
// ---------------------------------------------------------------------------
describe('mergeSpecIntoRequest (reset mode unchanged)', () => {
  const existing = {
    name: 'r', type: 'http-request',
    request: {
      method: 'post', url: '{{old}}/x',
      params: [{ name: 'q', value: 'mine', enabled: true }],
      headers: [{ name: 'H', value: 'mine', enabled: true }],
      body: { mode: 'json', json: '{"id":10}' },
      auth: { mode: 'oauth2', oauth2: { scope: 'read' } },
      script: { req: 'console.log(1)' }, tests: 'expect(1)', assertions: [{ k: 'a' }]
    }
  };
  const specItem = {
    name: 'r', type: 'http-request',
    request: {
      method: 'post', url: '{{spec}}/x',
      params: [{ name: 'q', value: '', enabled: true }, { name: 'p', value: '', enabled: true }],
      headers: [{ name: 'H', value: '', enabled: true }],
      body: { mode: 'json', json: '{"id":0,"name":""}' },
      auth: { mode: 'oauth2', oauth2: { scope: '' } }
    }
  };

  it('body comes straight from spec in reset mode', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem, { fullReset: true });
    expect(out.request.body).toEqual(specItem.request.body);
  });

  it('auth comes straight from spec in reset mode', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem, { fullReset: true });
    expect(out.request.auth).toEqual(specItem.request.auth);
  });

  it('method comes from spec in reset mode', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem, { fullReset: true });
    expect(out.request.method).toBe('post');
  });

  it('preserves script, tests, and assertions in reset mode', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem, { fullReset: true });
    expect(out.request.script).toEqual({ req: 'console.log(1)' });
    expect(out.request.tests).toBe('expect(1)');
    expect(out.request.assertions).toEqual([{ k: 'a' }]);
  });
});

// ---------------------------------------------------------------------------
// Task 8: compareRequestFields auth comparison
// ---------------------------------------------------------------------------
describe('compareRequestFields auth comparison', () => {
  const base = { params: [], headers: [], body: { mode: 'none' } };

  it('same auth mode with different config values -> hasDiff === false', () => {
    const spec = { ...base, auth: { mode: 'oauth2', oauth2: { accessTokenUrl: 'https://x', scope: '' } } };
    const actual = { ...base, auth: { mode: 'oauth2', oauth2: { accessTokenUrl: '{{url}}', scope: 'read' } } };
    expect(helpers.compareRequestFields(spec, actual).hasDiff).toBe(false);
  });

  it('different auth modes -> hasDiff true and changes mention "auth"', () => {
    const spec = { ...base, auth: { mode: 'oauth2', oauth2: {} } };
    const actual = { ...base, auth: { mode: 'apikey', apikey: {} } };
    const result = helpers.compareRequestFields(spec, actual);
    expect(result.hasDiff).toBe(true);
    expect(result.changes.join(',')).toContain('auth');
  });
});
