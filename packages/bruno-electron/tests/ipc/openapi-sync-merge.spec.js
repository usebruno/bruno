/**
 * Tests for openapi-sync merge helpers (Batch A: Tasks 1-4).
 * Run: cd packages/bruno-electron && npx jest tests/ipc/openapi-sync-merge.spec.js
 */
const { describe, it, expect, beforeAll } = require('@jest/globals');
const { parseRequest, stringifyRequest } = require('@usebruno/filestore');

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
  const string = { type: 'string' };
  const object = (properties) => ({ type: 'object', properties });
  const declaredFor = (schema, components) => helpers.declaredBodyOf({ openapi: '3.0.3', info: { title: 'Pets', version: '1' }, paths: { '/pets': { post: { requestBody: { content: { 'application/json': { schema } } } } } }, components }, 'POST', '/pets');

  it('keeps user value for shared key', () => {
    expect(helpers.mergeJsonValues({ id: 10 }, { id: 0 }, true)).toEqual({ id: 10 });
  });

  it('adds key spec introduces', () => {
    expect(helpers.mergeJsonValues({ id: 10 }, { id: 0, name: '' }, true)).toEqual({ id: 10, name: '' });
  });

  it('removes key spec dropped', () => {
    expect(helpers.mergeJsonValues({ id: 10, old: 'x' }, { id: 0 }, true)).toEqual({ id: 10 });
  });

  it('keeps a field the schema declares in another oneOf alternative', () => {
    const declared = declaredFor({ oneOf: [object({ type: string, repoId: { type: 'integer' } }), object({ type: string, projectId: { type: 'integer' } })] });
    expect(helpers.mergeJsonValues({ type: 'gitlab', projectId: 987654, debug: true }, { type: '' }, true, declared)).toEqual({ type: 'gitlab', projectId: 987654 });
  });

  it('keeps only the declared fields of an object the spec example leaves out', () => {
    const declared = declaredFor(object({ id: { type: 'integer' }, owner: object({ name: string }) }));
    expect(helpers.mergeJsonValues({ id: 7, owner: { name: 'Ann', debug: true } }, { id: 0 }, true, declared)).toEqual({ id: 7, owner: { name: 'Ann' } });
  });

  it('keeps a user object as written where the spec example has a scalar', () => {
    const declared = declaredFor(object({ payment: { oneOf: [object({ iban: string })] } }));
    expect(helpers.mergeJsonValues({ payment: { iban: 'DE', note: 'mine' } }, { payment: '' }, true, declared)).toEqual({ payment: { iban: 'DE', note: 'mine' } });
  });

  it('keeps a user array as written where the spec example array is empty', () => {
    const declared = declaredFor(object({ list: { type: 'array', items: object({ a: { type: 'integer' } }) } }));
    expect(helpers.mergeJsonValues({ list: [{ a: 1, note: 'mine' }] }, { list: [] }, true, declared)).toEqual({ list: [{ a: 1, note: 'mine' }] });
  });

  describe('when the spec example shows another oneOf alternative than the user sends', () => {
    const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
    const components = { schemas: { Card: object({ kind: string, holder: string, cardNumber: string }), Iban: object({ kind: string, holder: string, iban: string }) } };
    const cardExample = { kind: '', holder: '', cardNumber: '' };
    const merge = (user, schema, example = cardExample) => helpers.mergeJsonValues(user, example, true, declaredFor(schema, components));

    it('does not add the fields only the other alternative declares', () => {
      expect(merge({ holder: 'Ann', iban: 'DE89' }, { oneOf: [ref('Card'), ref('Iban')] })).toEqual({ kind: '', holder: 'Ann', iban: 'DE89' });
    });

    it('matches the alternative by the discriminator mapping', () => {
      const schema = { oneOf: [ref('Card'), ref('Iban')], discriminator: { propertyName: 'kind', mapping: { c: '#/components/schemas/Card', i: '#/components/schemas/Iban' } } };
      expect(merge({ kind: 'i' }, schema)).toEqual({ kind: 'i', holder: '' });
    });

    it('matches the alternative by its schema name when the discriminator has no mapping', () => {
      expect(merge({ kind: 'Iban' }, { oneOf: [ref('Card'), ref('Iban')], discriminator: { propertyName: 'kind' } })).toEqual({ kind: 'Iban', holder: '' });
    });

    it('matches the alternative whose discriminator property allows the value', () => {
      const schema = { oneOf: [object({ kind: { enum: ['card'] }, cardNumber: string }), object({ kind: { const: 'iban' }, iban: string })], discriminator: { propertyName: 'kind' } };
      expect(merge({ kind: 'iban' }, schema, { kind: '', cardNumber: '' })).toEqual({ kind: 'iban' });
    });

    it('adds the example fields when no single alternative matches best', () => {
      expect(merge({ holder: 'Ann' }, { oneOf: [ref('Card'), ref('Iban')] }, { kind: '', holder: '', iban: '' })).toEqual({ kind: '', holder: 'Ann', iban: '' });
    });

    it('adds a field the alternatives share through allOf', () => {
      const schema = { allOf: [object({ currency: string }), { oneOf: [ref('Card'), ref('Iban')] }] };
      expect(merge({ iban: 'DE89' }, schema, { currency: '', cardNumber: '' })).toEqual({ currency: '', iban: 'DE89' });
    });

    it('matches each array item on its own', () => {
      const schema = object({ payments: { type: 'array', items: { type: 'object', oneOf: [ref('Card'), ref('Iban')] } } });
      expect(merge({ payments: [{ iban: 'DE89' }, { cardNumber: '4111' }] }, schema, { payments: [{ cardNumber: '' }] })).toEqual({ payments: [{ iban: 'DE89' }, { cardNumber: '4111' }] });
    });

    it('keeps an empty user array whose items offer a choice of shapes', () => {
      const schema = object({ payments: { type: 'array', items: { oneOf: [ref('Card'), ref('Iban')] } } });
      expect(merge({ payments: [] }, schema, { payments: [{ cardNumber: '' }] })).toEqual({ payments: [] });
    });

    it('keeps array items that offer a choice of shapes under a key the spec example leaves out', () => {
      const schema = object({ order: { type: 'object', oneOf: [object({ cash: { type: 'number' } }), object({ payments: { type: 'array', items: { oneOf: [ref('Card'), ref('Iban')] } } })] } });
      expect(merge({ order: { payments: [{ iban: 'DE89', note: 'mine' }] } }, schema, { order: { cash: 0 } })).toEqual({ order: { payments: [{ iban: 'DE89', note: 'mine' }] } });
    });
  });

  describe('when the spec object is empty', () => {
    it('keeps the user object when no schema declares its fields', () => {
      expect(helpers.mergeJsonValues({ name: 'Rex', meta: { campaign: 'spring', tags: { a: 1 } } }, { name: '', meta: {} }, true))
        .toEqual({ name: 'Rex', meta: { campaign: 'spring', tags: { a: 1 } } });
    });

    it('keeps only the fields the schema declares', () => {
      const declared = declaredFor(object({ id: { type: 'integer' }, owner: { allOf: [object({ name: string }), object({ age: { type: 'integer' } })] } }));
      expect(helpers.mergeJsonValues({ id: 7, owner: { name: 'Ann', age: 3, debug: true } }, { id: 0, owner: {} }, true, declared))
        .toEqual({ id: 7, owner: { name: 'Ann', age: 3 } });
    });

    it('keeps every field of a free-form map', () => {
      const declared = declaredFor(object({ metadata: { type: 'object', additionalProperties: string } }));
      expect(helpers.mergeJsonValues({ metadata: { env: 'prod', team: { name: 'core' } } }, { metadata: {} }, true, declared))
        .toEqual({ metadata: { env: 'prod', team: { name: 'core' } } });
    });

    it('keeps the whole user body when the spec body is an empty object', () => {
      expect(helpers.mergeJsonValues({ name: 'Rex', age: 3 }, {}, true)).toEqual({ name: 'Rex', age: 3 });
    });

    it('keeps each user array element when the spec element is an empty object', () => {
      expect(helpers.mergeJsonValues({ items: [{ k: 'a' }, { k: 'b', n: 1 }] }, { items: [{}] }, true)).toEqual({ items: [{ k: 'a' }, { k: 'b', n: 1 }] });
    });

    it('keeps only the declared fields of each user array element', () => {
      const declared = declaredFor(object({ items: { type: 'array', items: { type: 'object', oneOf: [object({ k: string }), object({ n: { type: 'integer' } })] } } }));
      expect(helpers.mergeJsonValues({ items: [{ k: 'a', debug: true }, { n: 1 }] }, { items: [{}] }, true, declared)).toEqual({ items: [{ k: 'a' }, { n: 1 }] });
    });

    it('keeps an empty user object', () => {
      expect(helpers.mergeJsonValues({ meta: {} }, { meta: {} }, true)).toEqual({ meta: {} });
    });

    it('keeps a user value that is not an object', () => {
      expect(helpers.mergeJsonValues({ meta: null, list: [1] }, { meta: {}, list: {} }, true)).toEqual({ meta: null, list: [1] });
    });

    it('takes the empty spec object when preserve values is off', () => {
      expect(helpers.mergeJsonValues({ meta: { campaign: 'spring' } }, { meta: {} }, false)).toEqual({ meta: {} });
    });
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

  it('keeps the user json when the spec body has no json template', () => {
    const userBody = { mode: 'json', json: '{"amount": 5}' };
    for (const json of [null, undefined, '']) {
      expect(helpers.mergeJsonBody(userBody, { mode: 'json', json }, true).json).toBe('{"amount": 5}');
    }
  });

  it('takes the spec body when the user has no json', () => {
    const specBody = { mode: 'json', json: '{"id":0}' };
    for (const json of [null, undefined, '']) {
      expect(helpers.mergeJsonBody({ mode: 'json', json }, specBody, true)).toBe(specBody);
    }
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

  it('drops extra entries with a name the spec has once', () => {
    const out = helpers.mergeFieldListPreserving([{ name: 'id', value: '' }], [{ name: 'id', value: '1' }, { name: 'id', value: '2' }]);
    expect(out.map((e) => e.value)).toEqual(['1']);
  });

  it('drops a path param the spec does not have', () => {
    const out = helpers.mergeFieldListPreserving([{ name: 'petId', value: '', type: 'path' }], [{ name: 'id', value: '5', type: 'path' }]);
    expect(out.map((e) => e.name)).toEqual(['petId']);
  });

  it('pairs the enabled entry over a disabled one that has the spec value', () => {
    const limit = (value, enabled) => ({ name: 'limit', value, type: 'query', enabled });
    const out = helpers.mergeFieldListPreserving([limit('', false)], [limit('', false), limit('10', true)]);
    expect(out).toEqual([limit('10', true)]);
  });

  const status = (values, enabledValue) => values.map((value) => ({ name: 'status', value, type: 'query', enabled: value === enabledValue }));
  const valuesOf = (out) => out.map((e) => e.value);
  const enabledOf = (out) => out.filter((e) => e.enabled).map((e) => e.value);

  describe('without the previously synced spec', () => {
    it('adds a new default enum value disabled', () => {
      const out = helpers.mergeFieldListPreserving(status(['archived', 'available', 'sold'], 'archived'), status(['available', 'sold'], 'sold'));
      expect(enabledOf(out)).toEqual(['sold']);
    });

    it('keeps the enabled enum value when the spec reorders the values', () => {
      const out = helpers.mergeFieldListPreserving(status(['desc', 'asc']), status(['asc', 'desc'], 'asc'));
      expect(valuesOf(out)).toEqual(['desc', 'asc']);
      expect(enabledOf(out)).toEqual(['asc']);
    });

    it('keeps the user type and value of a multipart field', () => {
      const out = helpers.mergeFieldListPreserving([{ name: 'avatar', type: 'text', value: '' }], [{ name: 'avatar', type: 'file', value: ['/tmp/me.png'] }]);
      expect(out).toEqual([{ name: 'avatar', type: 'file', value: ['/tmp/me.png'] }]);
    });
  });

  describe('with the previously synced spec', () => {
    it('drops the entries the spec does not have, whether the user added them or the spec removed them', () => {
      const out = helpers.mergeFieldListPreserving([{ name: 'q', value: '' }], [{ name: 'q', value: 'hi' }, { name: 'debug', value: '1' }, { name: 'gone', value: 'x' }], true, [{ name: 'q', value: '' }, { name: 'gone', value: '' }]);
      expect(out.map((e) => [e.name, e.value])).toEqual([['q', 'hi']]);
    });

    it('follows the spec when preserve values is off', () => {
      const spec = [{ name: 'q', value: '' }];
      expect(helpers.mergeFieldListPreserving(spec, [{ name: 'debug', value: '1' }], false, [])).toEqual(spec);
    });

    it('keeps the user value when it still equals the previous spec value', () => {
      const out = helpers.mergeFieldListPreserving([{ name: 'sort', value: 'name' }], [{ name: 'sort', value: 'id' }], true, [{ name: 'sort', value: 'id' }]);
      expect(out.map((e) => e.value)).toEqual(['id']);
    });

    it('keeps a value the user edited when the spec value changes', () => {
      const out = helpers.mergeFieldListPreserving([{ name: 'sort', value: 'name' }], [{ name: 'sort', value: 'date' }], true, [{ name: 'sort', value: 'id' }]);
      expect(out.map((e) => e.value)).toEqual(['date']);
    });

    it('takes the spec entry when a multipart field switches between text and file', () => {
      const out = helpers.mergeFieldListPreserving([{ name: 'avatar', type: 'file', value: [] }], [{ name: 'avatar', type: 'text', value: 'abc' }], true, [{ name: 'avatar', type: 'text', value: '' }]);
      expect(out).toEqual([{ name: 'avatar', type: 'file', value: [] }]);
    });

    describe('enum params', () => {
      it('keeps the enabled value when the spec adds a value in front of it', () => {
        const out = helpers.mergeFieldListPreserving(status(['archived', 'available', 'pending', 'sold']), status(['available', 'pending', 'sold'], 'available'), true, status(['available', 'pending', 'sold']));
        expect(valuesOf(out)).toEqual(['archived', 'available', 'pending', 'sold']);
        expect(enabledOf(out)).toEqual(['available']);
      });

      it('keeps the enabled value when the spec reorders the values', () => {
        const out = helpers.mergeFieldListPreserving(status(['desc', 'asc']), status(['asc', 'desc'], 'asc'), true, status(['asc', 'desc']));
        expect(valuesOf(out)).toEqual(['desc', 'asc']);
        expect(enabledOf(out)).toEqual(['asc']);
      });

      it('drops a value the spec removed without moving the choice to another value', () => {
        const out = helpers.mergeFieldListPreserving(status(['available', 'pending']), status(['available', 'pending', 'sold'], 'sold'), true, status(['available', 'pending', 'sold']));
        expect(valuesOf(out)).toEqual(['available', 'pending']);
        expect(enabledOf(out)).toEqual([]);
      });

      it('replaces values the spec swapped out and takes its default', () => {
        const out = helpers.mergeFieldListPreserving(status(['c', 'd'], 'd'), status(['a', 'b'], 'a'), true, status(['a', 'b']));
        expect(valuesOf(out)).toEqual(['c', 'd']);
        expect(enabledOf(out)).toEqual(['d']);
      });

      it('adds a new default value disabled so the user choice stays the only one sent', () => {
        const out = helpers.mergeFieldListPreserving(status(['archived', 'available', 'sold'], 'archived'), status(['available', 'sold'], 'sold'), true, status(['available', 'sold']));
        expect(valuesOf(out)).toEqual(['archived', 'available', 'sold']);
        expect(enabledOf(out)).toEqual(['sold']);
      });

      it('adds a new default value disabled when the user turned every value off', () => {
        const out = helpers.mergeFieldListPreserving(status(['archived', 'available'], 'archived'), status(['available']), true, status(['available']));
        expect(enabledOf(out)).toEqual([]);
      });

      it('takes the spec values when a plain param becomes an enum', () => {
        const out = helpers.mergeFieldListPreserving(status(['a', 'b'], 'b'), [{ name: 'status', value: '', type: 'query', enabled: true }], true, [{ name: 'status', value: '', type: 'query' }]);
        expect(valuesOf(out)).toEqual(['a', 'b']);
        expect(enabledOf(out)).toEqual(['b']);
      });

      it('keeps a custom value when a plain param becomes an enum', () => {
        const out = helpers.mergeFieldListPreserving(status(['a', 'b'], 'b'), [{ name: 'status', value: 'mine', type: 'query', enabled: true }], true, [{ name: 'status', value: '', type: 'query' }]);
        expect(valuesOf(out)).toEqual(['mine', 'b']);
        expect(enabledOf(out)).toEqual(['mine']);
      });

      it('keeps an entry whose value the user changed', () => {
        const out = helpers.mergeFieldListPreserving(status(['a', 'b']), status(['a', 'bb'], 'bb'), true, status(['a', 'b']));
        expect(valuesOf(out)).toEqual(['a', 'bb']);
        expect(enabledOf(out)).toEqual(['bb']);
      });

      it('drops a value the user added under the same name', () => {
        const out = helpers.mergeFieldListPreserving(status(['a', 'b']), status(['a', 'b', 'z'], 'z'), true, status(['a', 'b']));
        expect(valuesOf(out)).toEqual(['a', 'b']);
        expect(enabledOf(out)).toEqual([]);
      });

      it.each([
        ['active', ''],
        ['inactive', ''],
        ['active', 'inactive'],
        ['inactive', 'active'],
        ['active', 'active']
      ])('keeps the chosen value %s when the spec turns the enum into a plain value with the example "%s"', (chosen, example) => {
        const out = helpers.mergeFieldListPreserving(status([example]), status(['active', 'inactive'], chosen), true, status(['active', 'inactive']));
        expect(out).toEqual([{ name: 'status', value: chosen, type: 'query', enabled: true }]);
      });

      it('keeps the entry with the spec value when a key with several enabled entries now has one', () => {
        const ids = (values) => values.map((value) => ({ name: 'ids', value, type: 'query', enabled: true }));
        const out = helpers.mergeFieldListPreserving(ids(['2']), ids(['1', '2']), true, ids(['1', '2']));
        expect(out).toEqual([{ name: 'ids', value: '2', type: 'query', enabled: true }]);
      });

      it('pairs the enabled copy when the user has the spec value twice and the disabled copy comes first', () => {
        const limit = (value, enabled) => ({ name: 'limit', value, type: 'query', enabled });
        const out = helpers.mergeFieldListPreserving([limit('50', true)], [limit('50', false), limit('10', true), limit('50', true)], true, [limit('10', false), limit('50', false)]);
        expect(out).toEqual([limit('50', true)]);
      });

      it('keeps the param off when the user had no value enabled and the spec turns the enum into a plain value', () => {
        const out = helpers.mergeFieldListPreserving(status(['inactive']), status(['active', 'inactive']), true, status(['active', 'inactive']));
        expect(out).toEqual([{ name: 'status', value: 'inactive', type: 'query', enabled: false }]);
      });
    });

    it('keeps the value that matches the spec when a plain param has several', () => {
      const plain = (value, enabled) => ({ name: 'status', value, type: 'query', enabled });
      const out = helpers.mergeFieldListPreserving([plain('pending', true)], [plain('available', true), plain('pending', true)], true, [plain('available', true)]);
      expect(out).toEqual([plain('pending', true)]);
    });

    it('pairs entries named like built-in object properties', () => {
      const names = ['constructor', 'toString', '__proto__'];
      const out = helpers.mergeFieldListPreserving(names.map((name) => ({ name, value: '' })), names.map((name) => ({ name, value: `my ${name}` })), true, names.map((name) => ({ name, value: '' })));
      expect(out.map((e) => [e.name, e.value])).toEqual(names.map((name) => [name, `my ${name}`]));
    });

    it('ignores empty entries in the lists', () => {
      const out = helpers.mergeFieldListPreserving([{ name: 'q', value: '' }], [null, { name: 'q', value: 'hi' }], true, [null, { name: 'q', value: '' }]);
      expect(out).toEqual([{ name: 'q', value: 'hi' }]);
    });

    it('keeps a file the user picked for a field the spec still declares as text', () => {
      const out = helpers.mergeFieldListPreserving([{ name: 'avatar', type: 'text', value: '' }], [{ name: 'avatar', type: 'file', value: ['/tmp/me.png'], enabled: true }], true, [{ name: 'avatar', type: 'text', value: '' }]);
      expect(out).toEqual([{ name: 'avatar', type: 'file', value: ['/tmp/me.png'], enabled: true }]);
    });

    it('keeps the file the user picked when the spec switches the field to file', () => {
      const out = helpers.mergeFieldListPreserving([{ name: 'avatar', type: 'file', value: [] }], [{ name: 'avatar', type: 'file', value: ['/tmp/me.png'] }], true, [{ name: 'avatar', type: 'text', value: '' }]);
      expect(out).toEqual([{ name: 'avatar', type: 'file', value: ['/tmp/me.png'] }]);
    });

    it('keeps the content type the user set on a multipart field', () => {
      const out = helpers.mergeFieldListPreserving([{ name: 'doc', type: 'file', value: [] }], [{ name: 'doc', type: 'file', value: ['/tmp/a.json'], contentType: 'application/json' }], true, [{ name: 'doc', type: 'file', value: [] }]);
      expect(out).toEqual([{ name: 'doc', type: 'file', value: ['/tmp/a.json'], contentType: 'application/json' }]);
    });

    it('keeps a description the user wrote unless the spec has its own', () => {
      const spec = [{ name: 'q', value: '', description: '' }, { name: 'limit', value: '', description: 'Page size' }];
      const user = [{ name: 'q', value: 'hi', description: 'my search' }, { name: 'limit', value: '5', description: 'my note' }];
      const out = helpers.mergeFieldListPreserving(spec, user, true, spec);
      expect(out.map((e) => [e.name, e.description])).toEqual([['q', 'my search'], ['limit', 'Page size']]);
    });

    it('keeps the annotations of a paired entry', () => {
      const annotations = [{ name: 'deprecated' }, { name: 'internal', value: 'x' }];
      const out = helpers.mergeFieldListPreserving([{ name: 'X-Trace', value: '' }], [{ name: 'X-Trace', value: 'trace-1', enabled: true, annotations }], true, [{ name: 'X-Trace', value: '' }]);
      expect(out).toEqual([{ name: 'X-Trace', value: 'trace-1', enabled: true, annotations }]);
    });

    it('keeps the annotations and description when the spec switches a multipart field between text and file', () => {
      const annotations = [{ name: 'deprecated' }];
      const out = helpers.mergeFieldListPreserving([{ name: 'avatar', type: 'file', value: [], description: '' }], [{ name: 'avatar', type: 'text', value: 'abc', description: 'mine', annotations }], true, [{ name: 'avatar', type: 'text', value: '' }]);
      expect(out).toEqual([{ name: 'avatar', type: 'file', value: [], description: 'mine', annotations }]);
    });
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

  it('drops the form fields the user added', () => {
    const out = helpers.mergeBody(
      { mode: 'formUrlEncoded', formUrlEncoded: [{ name: 'a', value: 'mine' }, { name: 'custom', value: '1' }] },
      { mode: 'formUrlEncoded', formUrlEncoded: [{ name: 'a', value: '' }] }
    );
    expect(out.formUrlEncoded.map((e) => [e.name, e.value])).toEqual([['a', 'mine']]);
  });

  it('keeps a picked file and drops the multipart fields the user added', () => {
    const out = helpers.mergeBody(
      { mode: 'multipartForm', multipartForm: [{ name: 'file', type: 'file', value: ['/tmp/a.png'] }, { name: 'note', type: 'text', value: 'hi' }] },
      { mode: 'multipartForm', multipartForm: [{ name: 'file', type: 'file', value: [] }, { name: 'title', type: 'text', value: '' }] }
    );
    expect(out.multipartForm.map((e) => [e.name, e.value])).toEqual([['file', ['/tmp/a.png']], ['title', '']]);
  });

  describe('with the previously synced spec', () => {
    it('replaces a text body the user did not edit with the new spec text', () => {
      const out = helpers.mergeBody({ mode: 'text', text: 'old example' }, { mode: 'text', text: 'new example' }, true, { mode: 'text', text: 'old example' });
      expect(out.text).toBe('new example');
    });

    it('keeps a text body the user edited', () => {
      const out = helpers.mergeBody({ mode: 'text', text: 'my text' }, { mode: 'text', text: 'new example' }, true, { mode: 'text', text: 'old example' });
      expect(out.text).toBe('my text');
    });

    it('fills an empty text body with the spec text', () => {
      const out = helpers.mergeBody({ mode: 'text', text: '' }, { mode: 'text', text: 'new example' }, true, {});
      expect(out.text).toBe('new example');
    });

    it('treats a text body as unedited when only its line endings differ', () => {
      const out = helpers.mergeBody({ mode: 'text', text: 'line one\r\nline two' }, { mode: 'text', text: 'new example' }, true, { mode: 'text', text: 'line one\nline two' });
      expect(out.text).toBe('new example');
    });

    describe('xml', () => {
      const previousXml = '<?xml version="1.0" encoding="UTF-8"?>\n<Pet>\n  <name></name>\n  <legacy></legacy>\n</Pet>';
      const specXml = '<?xml version="1.0" encoding="UTF-8"?>\n<Pet>\n  <name></name>\n  <age></age>\n</Pet>';
      const syncXml = (userXml, previous = { mode: 'xml', xml: previousXml }) => helpers.mergeBody({ mode: 'xml', xml: userXml }, { mode: 'xml', xml: specXml }, true, previous).xml;

      it('replaces an xml body the user did not edit with the new spec xml', () => {
        expect(syncXml(previousXml)).toBe(specXml);
      });

      it('treats an xml body as unedited when only its line endings or outer whitespace differ', () => {
        expect(syncXml(`\n${previousXml.replace(/\n/g, '\r\n')}\r\n`)).toBe(specXml);
      });

      it.each([
        ['empty', ''],
        ['whitespace only', ' \n\t '],
        ['missing', undefined],
        ['null', null]
      ])('fills an xml body that is %s with the spec xml', (_, userXml) => {
        expect(syncXml(userXml)).toBe(specXml);
      });

      it.each([
        ['edited values', '<?xml version="1.0" encoding="UTF-8"?>\n<Pet>\n  <name>Rex</name>\n  <legacy>x</legacy>\n</Pet>'],
        ['changed indentation only', '<?xml version="1.0" encoding="UTF-8"?>\n<Pet>\n    <name></name>\n    <legacy></legacy>\n</Pet>'],
        ['a comment', '<Pet><!-- note --><name>Rex</name></Pet>'],
        ['a CDATA section', '<Pet><name><![CDATA[Rex & co]]></name></Pet>'],
        ['namespaces', '<p:Pet xmlns:p="urn:pets"><p:name>Rex</p:name></p:Pet>'],
        ['a different root element', '<Dog><name>Rex</name></Dog>'],
        ['a {{variable}}', '<Pet><name>{{petName}}</name></Pet>'],
        ['a template instead of xml', '{{petXml}}'],
        ['markup that does not parse', '<Pet><name>Rex</Pet>']
      ])('keeps an edited xml body with %s exactly as written', (_, userXml) => {
        expect(syncXml(userXml)).toBe(userXml);
      });

      it('keeps the user xml when the previous spec had no xml body for the endpoint', () => {
        expect(syncXml('<Pet><name>Rex</name></Pet>', {})).toBe('<Pet><name>Rex</name></Pet>');
        expect(syncXml('<Pet><name>Rex</name></Pet>', { mode: 'json', json: '{}' })).toBe('<Pet><name>Rex</name></Pet>');
      });

      it('takes the spec xml when preserve values is off', () => {
        expect(helpers.mergeBody({ mode: 'xml', xml: '<Pet><name>Rex</name></Pet>' }, { mode: 'xml', xml: specXml }, false, { mode: 'xml', xml: previousXml }).xml).toBe(specXml);
      });
    });

    it.each([
      ['a number', 123],
      ['true', true],
      ['an object', { data: '<a/>' }],
      ['a list', ['<a/>']]
    ])('keeps a raw body that is %s as it is instead of throwing', (_, value) => {
      for (const mode of ['xml', 'text', 'sparql']) {
        expect(helpers.mergeBody({ mode, [mode]: value }, { mode, [mode]: 'spec' }, true, { mode, [mode]: 'old' })[mode]).toEqual(value);
      }
    });

    it('applies the same rule to a sparql body', () => {
      const previous = { mode: 'sparql', sparql: 'SELECT ?s WHERE { ?s ?p ?o }' };
      const spec = { mode: 'sparql', sparql: 'SELECT ?s ?p WHERE { ?s ?p ?o }' };
      expect(helpers.mergeBody({ mode: 'sparql', sparql: previous.sparql }, spec, true, previous).sparql).toBe(spec.sparql);
      expect(helpers.mergeBody({ mode: 'sparql', sparql: 'SELECT * WHERE { ?s ?p ?o } LIMIT 5' }, spec, true, previous).sparql).toBe('SELECT * WHERE { ?s ?p ?o } LIMIT 5');
    });

    describe.each([
      ['formUrlEncoded', 'application/x-www-form-urlencoded'],
      ['multipartForm', 'multipart/form-data']
    ])('%s fields with the declared schema', (mode, mediaType) => {
      const string = { type: 'string' };
      const formSpecWith = (properties, example) => ({ openapi: '3.0.3', info: { title: 'Pets', version: '1' }, paths: { '/pets': { post: { requestBody: { content: { [mediaType]: { schema: { type: 'object', properties, ...(example ? { example } : {}) } } } } } } } });
      const body = (...pairs) => ({ mode, [mode]: pairs.map(([name, value]) => ({ name, value, type: 'text' })) });
      const namesAndValuesOf = (out) => out[mode].map(({ name, value }) => [name, value]);

      it('keeps a field the schema declares when the spec example leaves it out', () => {
        const declared = helpers.declaredBodyOf(formSpecWith({ name: string, tag: string }, { name: 'Rex' }), 'POST', '/pets');
        const out = helpers.mergeBody(body(['name', 'Max'], ['tag', 'good']), body(['name', 'Rex']), true, body(['name', ''], ['tag', '']), declared);
        expect(namesAndValuesOf(out)).toEqual([['name', 'Max'], ['tag', 'good']]);
      });

      it('drops a field the schema does not declare', () => {
        const declared = helpers.declaredBodyOf(formSpecWith({ name: string }), 'POST', '/pets');
        const out = helpers.mergeBody(body(['name', 'Max'], ['tag', 'good']), body(['name', '']), true, body(['name', ''], ['tag', '']), declared);
        expect(namesAndValuesOf(out)).toEqual([['name', 'Max']]);
      });

      it('drops a second entry of a field the spec lists', () => {
        const declared = helpers.declaredBodyOf(formSpecWith({ name: string, tag: string }), 'POST', '/pets');
        const out = helpers.mergeBody(body(['name', 'Max'], ['tag', 'a'], ['tag', 'b']), body(['name', ''], ['tag', '']), true, body(['name', ''], ['tag', '']), declared);
        expect(namesAndValuesOf(out)).toEqual([['name', 'Max'], ['tag', 'a']]);
      });
    });
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

  describe('url query string', () => {
    const userWith = (url, params) => ({ ...existing, request: { ...existing.request, url, params } });
    const specWith = (url, params) => ({ ...specItem, request: { ...specItem.request, url, params } });
    const query = (name, value, enabled) => ({ name, value, type: 'query', enabled });
    const statusAndLimit = [query('status', '', false), query('limit', '', false), { name: 'id', value: '', type: 'path', enabled: true }];
    const userParams = [query('status', 'sold', true), query('limit', '20', false), query('debug', '1', true), { name: 'id', value: '7', type: 'path', enabled: true }];
    const sync = (user, spec, options = { previousSpecItem: { request: { params: statusAndLimit } } }) => helpers.mergeSpecIntoRequest(user, spec, options).request.url;

    it('rebuilds the query string from the enabled query params the spec has', () => {
      expect(sync(userWith('{{old}}/pets/7?status=sold&debug=1', userParams), specWith('{{baseUrl}}/pets/:id', statusAndLimit))).toBe('{{baseUrl}}/pets/:id?status=sold');
    });

    it('adds a query param the spec added and turned on', () => {
      const spec = specWith('{{baseUrl}}/pets/:id', [...statusAndLimit, query('page', '', true)]);
      expect(sync(userWith('{{old}}/pets/7?status=sold&debug=1', userParams), spec)).toBe('{{baseUrl}}/pets/:id?status=sold&page=');
    });

    it('drops a query param the spec removed', () => {
      const user = userWith('{{old}}/pets/7?status=sold&old=1', [query('status', 'sold', true), query('old', '1', true)]);
      const previous = { request: { params: [query('status', '', false), query('old', '', false)] } };
      expect(sync(user, specWith('{{baseUrl}}/pets', [query('status', '', false)]), { previousSpecItem: previous })).toBe('{{baseUrl}}/pets?status=sold');
    });

    it('keeps a query param written without a value as it is', () => {
      const user = userWith('{{old}}/pets?flag&status=sold', [query('flag', '', true), query('status', 'sold', true)]);
      expect(sync(user, specWith('{{baseUrl}}/pets', [query('status', '', false), query('flag', '', false)]))).toBe('{{baseUrl}}/pets?status=sold&flag');
    });

    it('writes the value of a param that now has one', () => {
      const user = userWith('{{old}}/pets?flag', [query('flag', 'on', true)]);
      expect(sync(user, specWith('{{baseUrl}}/pets', [query('flag', '', false)]))).toBe('{{baseUrl}}/pets?flag=on');
    });

    it('keeps a value typed into the url next to the imported empty param', () => {
      const user = userWith('{{old}}/pets?limit=10', [query('limit', '10', true), query('limit', '', false)]);
      expect(sync(user, specWith('{{baseUrl}}/pets', [query('limit', '', false)]))).toBe('{{baseUrl}}/pets?limit=10');
    });

    it('keeps the chosen value in the url when the spec turns an enum into a plain value', () => {
      const user = userWith('{{old}}/pets?status=inactive', [query('status', 'active', false), query('status', 'inactive', true)]);
      const previous = { request: { params: [query('status', 'active', false), query('status', 'inactive', false)] } };
      expect(sync(user, specWith('{{baseUrl}}/pets', [query('status', '', false)]), { previousSpecItem: previous })).toBe('{{baseUrl}}/pets?status=inactive');
    });

    it('leaves no query string when no query param is enabled', () => {
      expect(sync(userWith('{{old}}/pets?status=sold', [query('status', 'sold', false)]), specWith('{{baseUrl}}/pets', statusAndLimit))).toBe('{{baseUrl}}/pets');
    });

    it('replaces a query string that is already in the spec url', () => {
      expect(sync(userWith('{{old}}/pets', [query('status', 'sold', true)]), specWith('{{baseUrl}}/pets?status=available', statusAndLimit))).toBe('{{baseUrl}}/pets?status=sold');
    });

    it('keeps {{variables}} and special characters in query values as written', () => {
      expect(sync(userWith('{{old}}/pets', [query('token', '{{token}}', true), query('q', 'a b&c', true)]), specWith('{{baseUrl}}/pets', [query('token', '', true), query('q', '', true)])))
        .toBe('{{baseUrl}}/pets?token={{token}}&q=a b&c');
    });

    it('rebuilds the query string when there is no previous spec', () => {
      expect(sync(userWith('{{old}}/pets', [query('status', 'sold', true)]), specWith('{{baseUrl}}/pets', statusAndLimit), {})).toBe('{{baseUrl}}/pets?status=sold');
    });

    it('takes the spec url as it is when preserve values is off', () => {
      const spec = specWith('{{baseUrl}}/pets', [query('status', 'available', true)]);
      expect(sync(userWith('{{old}}/pets?status=sold', [query('status', 'sold', true)]), spec, { preserveValues: false })).toBe('{{baseUrl}}/pets');
    });
  });

  it('url path follows the spec (Option A)', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem);
    expect(out.request.url).toBe('{{spec}}/x');
  });

  it('body: merges user json values into spec structure', () => {
    const out = helpers.mergeSpecIntoRequest(existing, specItem);
    expect(JSON.parse(out.request.body.json)).toEqual({ id: 10, name: '' });
  });

  describe('json body', () => {
    const syncBody = (userBody, specBody, options = {}) => {
      const user = { ...existing, request: { ...existing.request, body: { mode: 'json', json: JSON.stringify(userBody) } } };
      const spec = { ...specItem, request: { ...specItem.request, body: { mode: 'json', json: JSON.stringify(specBody) } } };
      return JSON.parse(helpers.mergeSpecIntoRequest(user, spec, options).request.body.json);
    };

    it('drops the fields the spec does not have and fills in new ones', () => {
      expect(syncBody({ name: 'Rex', debug: true, legacy: 'x' }, { name: '', age: 0 })).toEqual({ name: 'Rex', age: 0 });
    });

    it('keeps the user body when the spec body is empty', () => {
      expect(syncBody({ amount: 5, payment: { iban: 'DE89' } }, {})).toEqual({ amount: 5, payment: { iban: 'DE89' } });
    });

    it('follows the spec when preserve values is off', () => {
      expect(syncBody({ name: 'Rex', debug: true }, { name: '', age: 0 }, { preserveValues: false })).toEqual({ name: '', age: 0 });
    });

    it('keeps the user value when the spec value changes', () => {
      expect(syncBody({ status: 'active', name: 'Rex' }, { status: 'enabled', name: '' })).toEqual({ status: 'active', name: 'Rex' });
    });

    it('keeps the discriminator value when the spec renames its mapping key', () => {
      expect(syncBody({ petType: 'cat', meow: true }, { petType: 'feline', meow: false })).toEqual({ petType: 'cat', meow: true });
    });

    it('keeps an empty string where the spec now has an object', () => {
      expect(syncBody({ id: 7, owner: '' }, { id: 0, owner: { name: '', age: 0 } })).toEqual({ id: 7, owner: '' });
    });

    it('keeps an empty string where the spec value is an empty object', () => {
      expect(syncBody({ since: '' }, { since: {} })).toEqual({ since: '' });
    });

    it('keeps the values of fields named like built-in object properties', () => {
      expect(syncBody({ name: 'Rex', constructor: 'mine', toString: 'x' }, { name: '', constructor: '', toString: '' })).toEqual({ name: 'Rex', constructor: 'mine', toString: 'x' });
    });

    it('adds a spec field named like a built-in object property that the user does not have', () => {
      expect(syncBody({ name: 'Rex' }, { name: '', constructor: '' })).toEqual({ name: 'Rex', constructor: '' });
    });

    it('keeps a __proto__ field as a normal field', () => {
      const user = { ...existing, request: { ...existing.request, body: { mode: 'json', json: '{"name":"Rex","__proto__":{"admin":true}}' } } };
      const spec = { ...specItem, request: { ...specItem.request, body: { mode: 'json', json: '{"name":"","__proto__":{"admin":false}}' } } };
      const json = helpers.mergeSpecIntoRequest(user, spec).request.body.json;
      expect(JSON.parse(json)).toEqual(JSON.parse('{"name":"Rex","__proto__":{"admin":true}}'));
      expect(Object.keys(JSON.parse(json))).toEqual(['name', '__proto__']);
    });

    it('keeps {{variables}} in the user body', () => {
      const user = { ...existing, request: { ...existing.request, body: { mode: 'json', json: '{"name":"{{petName}}","id":{{petId}}}' } } };
      const spec = { ...specItem, request: { ...specItem.request, body: { mode: 'json', json: '{"name":"","id":0,"age":0}' } } };
      const json = helpers.mergeSpecIntoRequest(user, spec).request.body.json;
      expect(json).toBe('{\n  "name": "{{petName}}",\n  "id": {{petId}},\n  "age": 0\n}');
    });

    describe('with the declared schema', () => {
      const string = { type: 'string' };
      const object = (properties) => ({ type: 'object', properties });
      const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
      const components = {
        schemas: {
          Dog: object({ petType: string, bark: { type: 'boolean' } }),
          Cat: object({ petType: string, meow: { type: 'boolean' } }),
          Bird: object({ petType: string, chirp: { type: 'boolean' } }),
          Person: object({ name: string }),
          Node: object({ name: string, children: { type: 'array', items: ref('Node') } })
        },
        requestBodies: { Pet: { content: { 'application/json; charset=utf-8': { schema: object({ name: string, tag: string }) } } } }
      };
      const jsonSpecWith = (schema) => ({ openapi: '3.0.3', info: { title: 'Pets', version: '1' }, paths: { '/pets': { post: { requestBody: { content: { 'application/json': { schema } } } } } }, components });
      const declaredOptions = (schema) => ({ declaredBody: helpers.declaredBodyOf(jsonSpecWith(schema), 'POST', '/pets') });

      it('keeps the fields of an alternative the spec example does not show', () => {
        const options = declaredOptions({ oneOf: [ref('Bird'), ref('Dog'), ref('Cat')] });
        expect(syncBody({ petType: 'dog', bark: true, debug: true }, { petType: '' }, options)).toEqual({ petType: 'dog', bark: true });
      });

      it('keeps a field the schema declares when the spec example leaves it out', () => {
        expect(syncBody({ name: 'Max', tag: 'good' }, { name: 'Rex' }, declaredOptions(object({ name: string, tag: string })))).toEqual({ name: 'Max', tag: 'good' });
      });

      it('keeps a declared __proto__ field the spec example leaves out as a normal field', () => {
        const options = declaredOptions({ type: 'object', properties: JSON.parse('{"name":{"type":"string"},"__proto__":{"type":"object"}}') });
        const body = syncBody(JSON.parse('{"name":"Max","__proto__":{"admin":true}}'), { name: '' }, options);
        expect(body).toEqual(JSON.parse('{"name":"Max","__proto__":{"admin":true}}'));
        expect(Object.keys(body)).toEqual(['name', '__proto__']);
      });

      it('drops a field no alternative of the schema declares', () => {
        const options = declaredOptions({ oneOf: [object({ name: string }), ref('Dog')] });
        expect(syncBody({ name: 'Max', legacy: 'x' }, { name: '' }, options)).toEqual({ name: 'Max' });
      });

      it('looks through $ref and allOf in nested objects', () => {
        const owner = { allOf: [ref('Person'), object({ nickname: string })] };
        expect(syncBody({ owner: { name: 'Ann', nickname: 'A', debug: true } }, { owner: { name: '' } }, declaredOptions(object({ owner })))).toEqual({ owner: { name: 'Ann', nickname: 'A' } });
      });

      it('looks at the array item schema', () => {
        const tags = { type: 'array', items: object({ label: string, note: string }) };
        expect(syncBody({ tags: [{ label: 'a', note: 'n', debug: true }] }, { tags: [{ label: '' }] }, declaredOptions(object({ tags })))).toEqual({ tags: [{ label: 'a', note: 'n' }] });
      });

      it('handles a recursive schema', () => {
        const user = { name: 'a', children: [{ name: 'b', children: [{ name: 'c', children: [] }] }] };
        expect(syncBody(user, { name: '', children: [{ name: '' }] }, declaredOptions(ref('Node')))).toEqual(user);
      });

      it('finds a referenced request body for a path with a param', () => {
        const spec = { ...jsonSpecWith(string), paths: { '/pets/{petId}': { post: { requestBody: { $ref: '#/components/requestBodies/Pet' } } } } };
        const options = { declaredBody: helpers.declaredBodyOf(spec, 'POST', '/pets/:petId') };
        expect(syncBody({ name: 'Max', tag: 'good' }, { name: 'Rex' }, options)).toEqual({ name: 'Max', tag: 'good' });
      });

      it('falls back to the spec example when a schema cannot be resolved', () => {
        expect(syncBody({ name: 'Max', legacy: 'x' }, { name: '' }, declaredOptions({ $ref: 'pets.yaml#/Pet' }))).toEqual({ name: 'Max' });
      });

      it('counts properties written next to a $ref', () => {
        const withTag = { $ref: '#/components/schemas/Person', properties: { tag: string } };
        expect(syncBody({ name: 'Max', tag: 'good' }, { name: '' }, declaredOptions(withTag))).toEqual({ name: 'Max', tag: 'good' });
        expect(syncBody({ name: 'Max', tag: 'good' }, { name: '' }, declaredOptions(ref('Person')))).toEqual({ name: 'Max' });
      });

      it('does not count a property the schema forbids with false', () => {
        expect(syncBody({ name: 'Max', tag: 'good' }, { name: '' }, declaredOptions(object({ name: string, tag: false })))).toEqual({ name: 'Max' });
      });

      it('looks at prefixItems', () => {
        const tags = { type: 'array', prefixItems: [object({ label: string, note: string })] };
        expect(syncBody({ tags: [{ label: 'a', note: 'n', debug: true }] }, { tags: [{ label: '' }] }, declaredOptions(object({ tags })))).toEqual({ tags: [{ label: 'a', note: 'n' }] });
      });

      it('resolves a percent-encoded reference', () => {
        const spec = {
          ...jsonSpecWith(string),
          paths: {
            '/pets/{petId}': { post: { requestBody: { content: { 'application/json': { schema: object({ name: string, tag: string }) } } } } },
            '/dogs/{petId}': { post: { requestBody: { $ref: '#/paths/~1pets~1%7BpetId%7D/post/requestBody' } } }
          }
        };
        const options = { declaredBody: helpers.declaredBodyOf(spec, 'POST', '/dogs/:petId') };
        expect(syncBody({ name: 'Max', tag: 'good' }, { name: '' }, options)).toEqual({ name: 'Max', tag: 'good' });
      });

      it('reads only the first media type, like the converter', () => {
        const withMediaTypes = (first, second) => ({ ...jsonSpecWith(string), paths: { '/pets': { post: { requestBody: { content: { 'application/json': { schema: first }, 'application/merge-patch+json': { schema: second } } } } } } });
        const options = { declaredBody: helpers.declaredBodyOf(withMediaTypes(object({ name: string }), object({ name: string, legacy: string })), 'POST', '/pets') };
        expect(syncBody({ name: 'Max', legacy: 'x' }, { name: '' }, options)).toEqual({ name: 'Max' });
      });

      it('finds a path with a colon inside a segment', () => {
        const spec = { ...jsonSpecWith(string), paths: { '/v1/pets:batchGet': { post: { requestBody: { content: { 'application/json': { schema: object({ name: string, tag: string }) } } } } } } };
        const options = { declaredBody: helpers.declaredBodyOf(spec, 'POST', '/v1/pets:batchGet') };
        expect(syncBody({ name: 'Max', tag: 'good' }, { name: '' }, options)).toEqual({ name: 'Max', tag: 'good' });
      });
    });
  });

  it('keeps .bru annotations on params and headers, with a single description', () => {
    const bru = [
      'meta {', '  name: r', '  type: http', '  seq: 1', '}', '',
      'post {', '  url: {{old}}/x?q=mine', '  body: none', '  auth: none', '}', '',
      'params:query {', '  @deprecated', '  @description(\'my search\')', '  q: mine', '}', '',
      'headers {', '  @internal(\'x\')', '  H: mine', '}', ''
    ].join('\n');
    const specParams = [{ name: 'q', value: '', type: 'query', enabled: true, description: 'Search text' }];
    const specHeaders = [{ name: 'H', value: '', enabled: true }];
    const spec = { ...specItem, request: { ...specItem.request, params: specParams, headers: specHeaders, body: { mode: 'none' }, auth: { mode: 'none' } } };
    const previousSpecItem = { request: { params: specParams, headers: specHeaders, body: {} } };
    const written = stringifyRequest(helpers.mergeSpecIntoRequest(parseRequest(bru, { format: 'bru' }), spec, { previousSpecItem }), { format: 'bru' });
    expect(written).toContain('@deprecated');
    expect(written).toContain('@internal(\'x\')');
    expect(written.match(/@description/g)).toHaveLength(1);
    expect(written).toContain('Search text');
    expect(written).not.toContain('my search');
  });

  it('headers: matches names case-insensitively', () => {
    const withLowerCase = { ...existing, request: { ...existing.request, headers: [{ name: 'x-debug', value: '1', enabled: true }] } };
    const spec = { ...specItem, request: { ...specItem.request, headers: [{ name: 'X-Debug', value: '', enabled: true }] } };
    const previousSpecItem = { request: { headers: [{ name: 'X-Debug', value: '' }] } };
    const out = helpers.mergeSpecIntoRequest(withLowerCase, spec, { previousSpecItem });
    expect(out.request.headers.map((h) => [h.name, h.value])).toEqual([['X-Debug', '1']]);
  });

  it('headers: keeps the user value when the imported empty header is still there', () => {
    const withBoth = { ...existing, request: { ...existing.request, headers: [{ name: 'X-Debug', value: '', enabled: false }, { name: 'x-debug', value: '1', enabled: true }] } };
    const spec = { ...specItem, request: { ...specItem.request, headers: [{ name: 'X-Debug', value: '', enabled: false }] } };
    const out = helpers.mergeSpecIntoRequest(withBoth, spec, { previousSpecItem: { request: { headers: [{ name: 'X-Debug', value: '' }] } } });
    expect(out.request.headers.map((h) => [h.name, h.value, h.enabled])).toEqual([['X-Debug', '1', true]]);
  });

  it('params: keeps a query param and a path param with the same name apart', () => {
    const withBoth = { ...existing, request: { ...existing.request, params: [{ name: 'id', value: 'q1', type: 'query', enabled: true }, { name: 'id', value: '7', type: 'path', enabled: true }] } };
    const specParams = [{ name: 'id', value: '', type: 'path', enabled: true }, { name: 'id', value: '', type: 'query', enabled: true }];
    const spec = { ...specItem, request: { ...specItem.request, params: specParams } };
    const out = helpers.mergeSpecIntoRequest(withBoth, spec, { previousSpecItem: { request: { params: specParams } } });
    expect(out.request.params.map((p) => [p.type, p.value])).toEqual([['path', '7'], ['query', 'q1']]);
  });

  it('params: pairs a param saved without a type with the spec query param', () => {
    const untyped = { ...existing, request: { ...existing.request, params: [{ name: 'q', value: 'mine', enabled: true }] } };
    const spec = { ...specItem, request: { ...specItem.request, params: [{ name: 'q', value: '', type: 'query', enabled: true }] } };
    const out = helpers.mergeSpecIntoRequest(untyped, spec, { previousSpecItem: { request: { params: [{ name: 'q', value: '', type: 'query' }] } } });
    expect(out.request.params.map((p) => [p.type, p.name, p.value])).toEqual([['query', 'q', 'mine']]);
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

  it('params and headers: drops the ones the spec does not have, whether the user added them or the spec removed them', () => {
    const withExtras = {
      ...existing,
      request: {
        ...existing.request,
        params: [...existing.request.params, { name: 'debug', value: '1', enabled: true }, { name: 'old', value: 'x', enabled: true }],
        headers: [...existing.request.headers, { name: 'X-Debug', value: '1', enabled: true }]
      }
    };
    const previousSpecItem = { request: { params: [{ name: 'q', value: '' }, { name: 'old', value: '' }], headers: [{ name: 'H', value: '' }] } };
    const out = helpers.mergeSpecIntoRequest(withExtras, specItem, { previousSpecItem });
    expect(out.request.params.map((p) => p.name)).toEqual(['q', 'p']);
    expect(out.request.headers.map((h) => h.name)).toEqual(['H']);
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

describe('compareRequestFields for a request a sync keeps', () => {
  const string = { type: 'string' };
  const object = (properties) => ({ type: 'object', properties });
  const declaredFor = (mediaType, schema) => helpers.declaredBodyOf({ openapi: '3.0.3', info: { title: 'Pets', version: '1' }, paths: { '/pets': { post: { requestBody: { content: { [mediaType]: { schema } } } } } } }, 'POST', '/pets');
  const request = (body) => ({ params: [], headers: [], auth: { mode: 'none' }, body });
  const json = (value) => request({ mode: 'json', json: value === null ? null : JSON.stringify(value) });
  const compare = (spec, actual, declaredBody) => helpers.compareRequestFields(spec, actual, { keptBySync: true, declaredBody });

  it('treats json the spec gives no schema as unchanged, and still flags it between two specs', () => {
    expect(compare(json(null), json({ amount: 5 })).hasDiff).toBe(false);
    expect(helpers.compareRequestFields(json(null), json({ amount: 5 })).hasDiff).toBe(true);
  });

  it('treats a field the body schema declares as unchanged, and still flags it between two specs', () => {
    const declared = declaredFor('application/json', object({ name: string, tag: string }));
    expect(compare(json({ name: '' }), json({ name: 'Max', tag: 'good' }), declared).hasDiff).toBe(false);
    expect(helpers.compareRequestFields(json({ name: '' }), json({ name: 'Max', tag: 'good' })).hasDiff).toBe(true);
  });

  it('treats a free-form object as unchanged', () => {
    const declared = declaredFor('application/json', object({ metadata: { type: 'object' } }));
    expect(compare(json({ metadata: {} }), json({ metadata: { env: 'prod' } }), declared).hasDiff).toBe(false);
  });

  it('flags a field the schema does not declare and a field the user removed', () => {
    const declared = declaredFor('application/json', object({ name: string, age: { type: 'integer' } }));
    expect(compare(json({ name: '', age: 0 }), json({ name: 'Max', age: 3, debug: true }), declared).changes).toEqual(['body schema']);
    expect(compare(json({ name: '', age: 0 }), json({ name: 'Max' }), declared).changes).toEqual(['body schema']);
  });

  it('flags a json field whose type the user changed', () => {
    const declared = declaredFor('application/json', object({ owner: object({ id: string }), name: string }));
    expect(compare(json({ owner: { id: '' } }), json({ owner: 'Ann' }), declared).changes).toEqual(['body schema']);
    expect(compare(json({ name: '' }), json({ name: { first: 'Ann' } }), declared).changes).toEqual(['body schema']);
    expect(compare(json({ owner: { id: '' } }), json({ owner: null }), declared).hasDiff).toBe(false);
  });

  it('flags a json field whose type the user changed when the schema also allows null', () => {
    const declared = declaredFor('application/json', object({ nickname: { type: ['string', 'null'] }, tag: { anyOf: [string, { type: 'null' }] } }));
    expect(compare(json({ nickname: '', tag: '' }), json({ nickname: { first: 'Rex' }, tag: '' }), declared).changes).toEqual(['body schema']);
    expect(compare(json({ nickname: '', tag: '' }), json({ nickname: '', tag: { first: 'Rex' } }), declared).changes).toEqual(['body schema']);
  });

  it('does not flag an object that a union alternative without a type allows', () => {
    const declared = declaredFor('application/json', object({ owner: { anyOf: [{ type: ['string', 'null'] }, { const: { id: 1 } }] }, extra: { anyOf: [string, {}] } }));
    expect(compare(json({ owner: '', extra: '' }), json({ owner: { id: 1 }, extra: { any: true } }), declared).hasDiff).toBe(false);
  });

  it('flags an object in a string field whose union only narrows the format', () => {
    const declared = declaredFor('application/json', object({ when: { type: 'string', anyOf: [{ format: 'date' }, { format: 'date-time' }] } }));
    expect(compare(json({ when: '' }), json({ when: { day: 1 } }), declared).changes).toEqual(['body schema']);
  });

  it('flags an object where the spec example has a plain value and no schema says otherwise', () => {
    expect(compare(json({ meta: '' }), json({ meta: { env: 'prod' } })).changes).toEqual(['body schema']);
  });

  it('does not flag the object the user sends for a oneOf property the spec writes as ""', () => {
    const declared = declaredFor('application/json', object({ payment: { oneOf: [object({ iban: string }), object({ cardNumber: string })] } }));
    expect(compare(json({ payment: '' }), json({ payment: { iban: 'DE89' } }), declared).hasDiff).toBe(false);
  });

  it('treats a form field the body schema declares as unchanged, and flags a field type the user changed', () => {
    const declared = declaredFor('application/x-www-form-urlencoded', object({ name: string, tag: string }));
    const form = (...names) => request({ mode: 'formUrlEncoded', formUrlEncoded: names.map((name) => ({ name, value: '' })) });
    expect(compare(form('name'), form('name', 'tag'), declared).hasDiff).toBe(false);
    expect(compare(form('name'), form('name', 'debug'), declared).changes).toEqual(['+1 form fields']);

    const multipart = (type) => request({ mode: 'multipartForm', multipartForm: [{ name: 'avatar', type, value: '' }] });
    expect(compare(multipart('text'), multipart('file'), declaredFor('multipart/form-data', object({ avatar: string }))).changes).toEqual(['+1 form fields', '-1 form fields']);
  });
});
