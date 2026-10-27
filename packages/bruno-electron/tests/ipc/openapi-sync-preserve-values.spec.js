const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

let mockUserData;

jest.mock('electron', () => {
  const handlers = {};
  return {
    ipcMain: {
      handle: jest.fn((channel, handler) => {
        handlers[channel] = handler;
      }),
      on: jest.fn(),
      _getHandler: (channel) => handlers[channel]
    },
    app: { getPath: jest.fn(() => mockUserData), getVersion: jest.fn(() => '1.0.0') }
  };
});

jest.mock('@usebruno/filestore', () => {
  const filestore = jest.requireActual('@usebruno/filestore');
  return { ...filestore, stringifyRequestViaWorker: async (item, options) => filestore.stringifyRequest(item, options) };
});

const { ipcMain } = require('electron');
const { parseRequest, stringifyRequest, stringifyCollection } = require('@usebruno/filestore');
const { openApiToBruno } = require('@usebruno/converters');
const registerOpenAPISyncIpc = require('../../src/ipc/openapi-sync');

const SOURCE_URL = 'https://example.com/pets.json';
const OK = { 200: { description: 'OK' } };
const string = { type: 'string' };

const objectSchema = (properties) => ({ type: 'object', properties });
const jsonBody = (schema) => ({ content: { 'application/json': { schema } } });

const createPetSpec = (operation, components) => ({
  openapi: '3.0.3',
  info: { title: 'Pets', version: '1' },
  paths: { '/pets': { post: { summary: 'Create pet', responses: OK, ...operation } } },
  ...(components ? { components } : {})
});
const jsonSpec = (properties) => createPetSpec({ requestBody: jsonBody(objectSchema(properties)) });
const formSpec = (properties, headerName) => createPetSpec({
  parameters: [{ name: 'q', in: 'query', schema: string }, { name: headerName, in: 'header', schema: string }],
  requestBody: { content: { 'application/x-www-form-urlencoded': { schema: objectSchema(properties) } } }
});
const xmlSpec = (properties) => createPetSpec({
  requestBody: { content: { 'application/xml': { schema: { ...objectSchema(properties), xml: { name: 'Pet' } } } } }
});
const textSpec = (example) => createPetSpec({
  requestBody: { content: { 'text/plain': { schema: { type: 'string', example } } } }
});

const previousSpec = jsonSpec({ name: string, legacy: string });
const newSpec = jsonSpec({ name: string, age: { type: 'integer' } });

const withJsonBody = (body) => (request) => ({ ...request, body: { ...request.body, mode: 'json', json: JSON.stringify(body) } });

describe.each(['bru', 'yml'])('openapi sync with preserve values in a %s collection', (format) => {
  let collectionPath;
  let requestFile;

  const writeStoredSpecContent = (content) => {
    const specsDir = path.join(mockUserData, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, 'stored.json'), content);
    fs.writeFileSync(path.join(specsDir, 'metadata.json'), JSON.stringify({ [collectionPath]: [{ filename: 'stored.json', sourceUrl: SOURCE_URL }] }));
  };

  const writeStoredSpec = (spec) => writeStoredSpecContent(JSON.stringify(spec));

  const writeUserRequestFrom = (spec, edit, { name = 'Create pet', file = requestFile } = {}) => {
    const item = openApiToBruno(spec).items.find((each) => each.name === name);
    item.request = edit(item.request);
    fs.writeFileSync(file, stringifyRequest(item, { format }));
  };

  const writeUserRequest = (body) => writeUserRequestFrom(newSpec, withJsonBody(body));

  const preview = (spec, { endpointId = 'POST:/pets', preserveValues = true } = {}) =>
    ipcMain._getHandler('renderer:get-endpoint-diff-data')({}, { collectionPath, endpointId, newSpec: spec, preserveValues });

  const apply = (spec, diff, { preserveValues = true } = {}) => ipcMain._getHandler('renderer:apply-openapi-sync')({}, {
    collectionPath,
    addNewRequests: true,
    removeDeletedRequests: false,
    diff: { newSpec: spec, added: [], modified: [], removed: [], ...diff },
    mode: 'sync',
    preserveValues
  });

  const readRequest = (file = requestFile) => parseRequest(fs.readFileSync(file, 'utf8'), { format }).request;

  const modifiedPets = { modified: [{ method: 'POST', path: '/pets' }] };

  const previewBody = async ({ preserveValues = true } = {}) => JSON.parse((await preview(newSpec, { preserveValues })).newData.request.body.json);

  const applyAndReadBody = async (diff, { preserveValues = true } = {}) => {
    await apply(newSpec, diff, { preserveValues });
    return JSON.parse(readRequest().body.json);
  };

  const previewAndApply = async (spec) => {
    const { newData } = await preview(spec);
    await apply(spec, modifiedPets);
    return [newData.request, readRequest()];
  };

  const namesAndValues = (entries) => entries.map(({ name, value }) => [name, value]).sort(([a], [b]) => a.localeCompare(b));

  beforeEach(() => {
    mockUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sync-user-data-'));
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sync-collection-'));
    requestFile = path.join(collectionPath, `Create pet.${format}`);
    const config = { version: '1', name: 'Pets', type: 'collection', openapi: [{ sourceUrl: SOURCE_URL, groupBy: 'tags' }] };
    if (format === 'yml') {
      fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), stringifyCollection({}, { ...config, opencollection: '1.0.0' }, { format }));
    } else {
      fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify(config));
    }
    registerOpenAPISyncIpc({ webContents: { send: jest.fn() } });
  });

  afterEach(() => {
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    fs.rmSync(mockUserData, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('removes only the fields the spec removed, and the preview shows what the sync writes', async () => {
    writeStoredSpec(previousSpec);
    writeUserRequest({ name: 'Rex', legacy: 'x', debug: true });
    const expected = { name: 'Rex', age: 0, debug: true };

    expect(await previewBody()).toEqual(expected);
    expect(await applyAndReadBody(modifiedPets)).toEqual(expected);
  });

  it('keeps the user fields of a request for an endpoint the spec adds', async () => {
    writeStoredSpec({ ...previousSpec, paths: {} });
    writeUserRequest({ name: 'Rex', legacy: 'x', debug: true });
    const expected = { name: 'Rex', legacy: 'x', age: 0, debug: true };

    expect(await previewBody()).toEqual(expected);
    expect(await applyAndReadBody({ added: [{ method: 'POST', path: '/pets' }] })).toEqual(expected);
  });

  it('keeps the user fields when there is no stored spec to compare with', async () => {
    writeUserRequest({ name: 'Rex', legacy: 'x', debug: true });
    const expected = { name: 'Rex', legacy: 'x', age: 0, debug: true };

    expect(await previewBody()).toEqual(expected);
    expect(await applyAndReadBody(modifiedPets)).toEqual(expected);
  });

  describe('when the stored spec cannot be used', () => {
    let warn;
    let error;
    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      error = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
      warn.mockRestore();
      error.mockRestore();
    });

    it.each([
      ['truncated json', '{"openapi": "3.0.3", "paths": {'],
      ['broken yaml', 'openapi: 3.0.3\npaths: [\n'],
      ['null', 'null'],
      ['a list', '[]'],
      ['an object the converter rejects', '{}']
    ])('syncs without it and logs a warning when it is %s', async (_, content) => {
      writeStoredSpecContent(content);
      writeUserRequest({ name: 'Rex', legacy: 'x', debug: true });
      const expected = { name: 'Rex', legacy: 'x', age: 0, debug: true };

      expect(await previewBody()).toEqual(expected);
      expect(await applyAndReadBody(modifiedPets)).toEqual(expected);
      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn.mock.calls.every(([message]) => message.startsWith('[OpenAPI Sync]'))).toBe(true);
    });

    it('stays quiet when there is no stored spec yet', async () => {
      writeUserRequest({ name: 'Rex', debug: true });
      await previewBody();
      await applyAndReadBody(modifiedPets);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  it('writes the spec body when preserve values is off', async () => {
    writeStoredSpec(previousSpec);
    writeUserRequest({ name: 'Rex', legacy: 'x', debug: true });
    const expected = { name: '', age: 0 };

    expect(await previewBody({ preserveValues: false })).toEqual(expected);
    expect(await applyAndReadBody(modifiedPets, { preserveValues: false })).toEqual(expected);
  });

  it('keeps the form fields, query params and headers the user added, and drops the ones the spec removed', async () => {
    const previous = formSpec({ name: string, age: { type: 'integer' } }, 'X-Old');
    writeStoredSpec(previous);
    writeUserRequestFrom(previous, (request) => ({
      ...request,
      params: [...request.params.map((p) => ({ ...p, value: 'mine', enabled: true })), { name: 'debug', value: '1', type: 'query', enabled: true }],
      headers: [...request.headers.map((h) => ({ ...h, value: 'old', enabled: true })), { name: 'X-Debug', value: '1', enabled: true }],
      body: {
        ...request.body,
        formUrlEncoded: [...request.body.formUrlEncoded.map((f) => (f.name === 'name' ? { ...f, value: 'Rex' } : f)), { name: 'custom', value: '1', enabled: true }]
      }
    }));

    for (const request of await previewAndApply(formSpec({ name: string, color: string }, 'X-Trace'))) {
      expect(namesAndValues(request.body.formUrlEncoded)).toEqual([['color', ''], ['custom', '1'], ['name', 'Rex']]);
      expect(namesAndValues(request.params)).toEqual([['debug', '1'], ['q', 'mine']]);
      expect(namesAndValues(request.headers)).toEqual([['X-Debug', '1'], ['X-Trace', '']]);
    }
  });

  describe('drift view, which previews against the stored spec', () => {
    it('shows the form fields, query params and headers the user added as differences', async () => {
      const stored = formSpec({ name: string }, 'X-Trace');
      writeStoredSpec(stored);
      writeUserRequestFrom(stored, (request) => ({
        ...request,
        params: [...request.params.map((p) => ({ ...p, value: 'mine' })), { name: 'debug', value: '1', type: 'query', enabled: true }],
        headers: [...request.headers.map((h) => ({ ...h, value: 'trace-1' })), { name: 'X-Debug', value: '1', enabled: true }],
        body: { ...request.body, formUrlEncoded: [...request.body.formUrlEncoded.map((f) => ({ ...f, value: 'Rex' })), { name: 'custom', value: '1', enabled: true }] }
      }));

      for (const spec of [stored, JSON.parse(JSON.stringify(stored))]) {
        const { newData } = await preview(spec);
        expect(namesAndValues(newData.request.params)).toEqual([['q', 'mine']]);
        expect(namesAndValues(newData.request.headers)).toEqual([['X-Trace', 'trace-1']]);
        expect(namesAndValues(newData.request.body.formUrlEncoded)).toEqual([['name', 'Rex']]);
      }
    });

    it('shows the json fields the user added as differences and keeps a free-form object', async () => {
      const stored = jsonSpec({ name: string, metadata: { type: 'object', additionalProperties: string } });
      writeStoredSpec(stored);
      writeUserRequestFrom(stored, withJsonBody({ name: 'Rex', metadata: { env: 'prod' }, debug: true }));

      const { newData } = await preview(stored);
      expect(JSON.parse(newData.request.body.json)).toEqual({ name: 'Rex', metadata: { env: 'prod' } });
    });
  });

  it.each([
    ['has none either', createPetSpec({ requestBody: { content: { 'application/json': {} } } })],
    ['had one', jsonSpec({ name: string })]
  ])('keeps the user json body as written when the spec gives the body no schema and the stored spec %s', async (_, stored) => {
    writeStoredSpec(stored);
    writeUserRequestFrom(stored, withJsonBody({ amount: 5 }));

    for (const request of await previewAndApply(createPetSpec({ requestBody: { content: { 'application/json': {} } } }))) {
      expect(request.body.json).toBe('{"amount":5}');
    }
  });

  it('keeps what the user wrote in an object the spec turns into a free-form map', async () => {
    const previous = jsonSpec({ name: string, metadata: objectSchema({ env: string }) });
    writeStoredSpec(previous);
    writeUserRequestFrom(previous, withJsonBody({ name: 'Rex', metadata: { env: 'prod', team: '{{team}}' } }));

    for (const request of await previewAndApply(jsonSpec({ name: string, age: { type: 'integer' }, metadata: { type: 'object', additionalProperties: string } }))) {
      expect(JSON.parse(request.body.json)).toEqual({ name: 'Rex', age: 0, metadata: { env: 'prod', team: '{{team}}' } });
    }
  });

  describe('fields the schema still declares', () => {
    it('keeps the fields of a oneOf alternative when the spec puts a new one in front', async () => {
      const components = {
        schemas: {
          Dog: objectSchema({ petType: string, bark: { type: 'boolean' } }),
          Cat: objectSchema({ petType: string, meow: { type: 'boolean' } }),
          Bird: objectSchema({ petType: string, chirp: { type: 'boolean' } })
        }
      };
      const petBody = (...names) => createPetSpec({ requestBody: jsonBody({ oneOf: names.map((name) => ({ $ref: `#/components/schemas/${name}` })) }) }, components);
      const previous = petBody('Dog', 'Cat');
      writeStoredSpec(previous);
      writeUserRequestFrom(previous, withJsonBody({ petType: 'dog', bark: true }));

      for (const request of await previewAndApply(petBody('Bird', 'Dog', 'Cat'))) {
        expect(JSON.parse(request.body.json)).toMatchObject({ petType: 'dog', bark: true });
      }
    });

    describe('a nested oneOf whose example shows another alternative than the user sends', () => {
      const paymentSpec = (alternatives, properties) => createPetSpec({
        requestBody: jsonBody(objectSchema({
          amount: { type: 'number' },
          payment: { oneOf: alternatives.map((name) => ({ $ref: `#/components/schemas/${name}` })), example: { cardNumber: '' } },
          ...properties
        }))
      }, { schemas: { Card: objectSchema({ cardNumber: string }), Iban: objectSchema({ iban: string }) } });

      it('keeps the user\'s iban, drops what the spec removed and adds what it added', async () => {
        const previous = paymentSpec(['Card', 'Iban'], { legacy: string });
        writeStoredSpec(previous);
        writeUserRequestFrom(previous, withJsonBody({ amount: 5, payment: { iban: 'DE89' }, debug: true, legacy: 'x' }));

        for (const request of await previewAndApply(paymentSpec(['Card', 'Iban'], { currency: string }))) {
          expect(JSON.parse(request.body.json)).toEqual({ amount: 5, payment: { cardNumber: '', iban: 'DE89' }, currency: '', debug: true });
        }
      });

      it('drops the user\'s iban when the spec removes the iban alternative', async () => {
        const previous = paymentSpec(['Card', 'Iban'], {});
        writeStoredSpec(previous);
        writeUserRequestFrom(previous, withJsonBody({ amount: 5, payment: { iban: 'DE89' } }));

        for (const request of await previewAndApply(paymentSpec(['Card'], {}))) {
          expect(JSON.parse(request.body.json)).toEqual({ amount: 5, payment: { cardNumber: '' } });
        }
      });
    });

    it.each([
      ['without a type', {}],
      ['typed as an object', { type: 'object' }]
    ])('drops a field the spec removed from the oneOf alternative the user sends, with payment %s', async (_, paymentType) => {
      const paymentSpec = (ibanProperties) => createPetSpec({
        requestBody: jsonBody(objectSchema({
          amount: { type: 'number' },
          payment: { ...paymentType, oneOf: [{ $ref: '#/components/schemas/Card' }, { $ref: '#/components/schemas/Iban' }] }
        }))
      }, { schemas: { Card: objectSchema({ cardNumber: string }), Iban: objectSchema(ibanProperties) } });
      const previous = paymentSpec({ iban: string, bic: string });
      writeStoredSpec(previous);
      writeUserRequestFrom(previous, withJsonBody({ amount: 5, payment: { iban: 'DE', bic: 'B', note: 'mine' } }));

      for (const request of await previewAndApply(paymentSpec({ iban: string }))) {
        expect(JSON.parse(request.body.json)).toEqual({ amount: 5, payment: { iban: 'DE', note: 'mine' } });
      }
    });

    it('drops a field the spec removed from a top-level allOf body that imports as {}', async () => {
      const baseSpec = (properties) => createPetSpec({ requestBody: jsonBody({ allOf: [{ $ref: '#/components/schemas/Base' }] }) }, { schemas: { Base: objectSchema(properties) } });
      const previous = baseSpec({ name: string, legacy: string });
      writeStoredSpec(previous);
      writeUserRequestFrom(previous, withJsonBody({ name: 'Rex', legacy: 'x', debug: true }));

      for (const request of await previewAndApply(baseSpec({ name: string }))) {
        expect(JSON.parse(request.body.json)).toEqual({ name: 'Rex', debug: true });
      }
    });

    it('drops a field the spec removed from the items of an array whose template is empty', async () => {
      const paymentsSpec = (ibanProperties) => createPetSpec({
        requestBody: jsonBody(objectSchema({
          amount: { type: 'number' },
          payments: { type: 'array', items: { oneOf: [{ $ref: '#/components/schemas/Card' }, { $ref: '#/components/schemas/Iban' }] } }
        }))
      }, { schemas: { Card: objectSchema({ cardNumber: string }), Iban: objectSchema(ibanProperties) } });
      const previous = paymentsSpec({ iban: string, bic: string });
      writeStoredSpec(previous);
      writeUserRequestFrom(previous, withJsonBody({ amount: 5, payments: [{ iban: 'DE', bic: 'B' }] }));

      for (const request of await previewAndApply(paymentsSpec({ iban: string }))) {
        expect(JSON.parse(request.body.json)).toEqual({ amount: 5, payments: [{ iban: 'DE' }] });
      }
    });

    it('drops a field the spec removed beneath a key the spec example leaves out', async () => {
      const ownerSpec = (ownerProperties) => createPetSpec({
        requestBody: jsonBody({ ...objectSchema({ amount: { type: 'number' }, owner: { $ref: '#/components/schemas/Owner' } }), example: { amount: 0 } })
      }, { schemas: { Owner: objectSchema(ownerProperties) } });
      const previous = ownerSpec({ name: string, legacy: string });
      writeStoredSpec(previous);
      writeUserRequestFrom(previous, withJsonBody({ amount: 5, owner: { name: 'Rex', legacy: 'x' } }));

      for (const request of await previewAndApply(ownerSpec({ name: string }))) {
        expect(JSON.parse(request.body.json)).toEqual({ amount: 5, owner: { name: 'Rex' } });
      }
    });

    it('keeps a json field when the spec example leaves it out', async () => {
      const schema = objectSchema({ name: string, tag: string });
      const previous = createPetSpec({ requestBody: jsonBody(schema) });
      writeStoredSpec(previous);
      writeUserRequestFrom(previous, withJsonBody({ name: 'Max', tag: 'good' }));

      for (const request of await previewAndApply(createPetSpec({ requestBody: { content: { 'application/json': { schema, example: { name: 'Rex' } } } } }))) {
        expect(JSON.parse(request.body.json)).toEqual({ name: 'Max', tag: 'good' });
      }
    });

    it('keeps a form field when the spec example leaves it out', async () => {
      const formBody = (example) => createPetSpec({
        requestBody: { content: { 'application/x-www-form-urlencoded': { schema: { ...objectSchema({ name: string, tag: string }), ...(example ? { example } : {}) } } } }
      });
      const previous = formBody();
      writeStoredSpec(previous);
      writeUserRequestFrom(previous, (request) => ({
        ...request,
        body: { ...request.body, formUrlEncoded: request.body.formUrlEncoded.map((f) => ({ ...f, value: f.name === 'name' ? 'Max' : 'good' })) }
      }));

      for (const request of await previewAndApply(formBody({ name: 'Rex' }))) {
        expect(namesAndValues(request.body.formUrlEncoded)).toEqual([['name', 'Max'], ['tag', 'good']]);
      }
    });
  });

  it('keeps the enum value the user picked when the spec adds a value and a default in front of it', async () => {
    const enumSpec = (schema) => createPetSpec({ parameters: [{ name: 'status', in: 'query', schema: { type: 'string', ...schema } }] });
    const previous = enumSpec({ enum: ['available', 'pending', 'sold'] });
    writeStoredSpec(previous);
    writeUserRequestFrom(previous, (request) => ({ ...request, params: request.params.map((p) => ({ ...p, enabled: p.value === 'pending' })) }));

    for (const request of await previewAndApply(enumSpec({ enum: ['archived', 'available', 'pending', 'sold'], default: 'archived' }))) {
      expect(request.params.map((p) => p.value).sort()).toEqual(['archived', 'available', 'pending', 'sold']);
      expect(request.params.filter((p) => p.enabled).map((p) => p.value)).toEqual(['pending']);
    }
  });

  it('keeps the enum value the user picked when the spec turns the param into a plain one with another old value as example', async () => {
    const limitSpec = (schema) => createPetSpec({ parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', ...schema } }] });
    const previous = limitSpec({ enum: [10, 50] });
    writeStoredSpec(previous);
    writeUserRequestFrom(previous, (request) => ({ ...request, params: request.params.map((p) => ({ ...p, enabled: p.value === '50' })) }));

    const [previewed, applied] = await previewAndApply(limitSpec({ example: 10 }));
    for (const request of [previewed, applied]) {
      expect(request.params.map(({ value, enabled }) => [value, enabled])).toEqual([['50', true]]);
    }
    expect(applied.url).toBe('{{baseUrl}}/pets?limit=50');
  });

  it('replaces an xml body the user did not edit and keeps one the user did', async () => {
    const previous = xmlSpec({ name: string, legacy: string });
    const next = xmlSpec({ name: string, color: string });
    writeStoredSpec(previous);
    writeUserRequestFrom(previous, (request) => request);
    for (const request of await previewAndApply(next)) {
      expect(request.body.xml).toBe(openApiToBruno(next).items[0].request.body.xml);
    }

    const edited = '<Pet>\n  <name>Rex</name>\n  <legacy>x</legacy>\n</Pet>';
    writeStoredSpec(previous);
    writeUserRequestFrom(previous, (request) => ({ ...request, body: { ...request.body, xml: edited } }));
    for (const request of await previewAndApply(next)) {
      expect(request.body.xml).toBe(edited);
    }
  });

  it('replaces a text body the user did not edit and keeps one the user did', async () => {
    writeStoredSpec(textSpec('old example'));
    writeUserRequestFrom(textSpec('old example'), (request) => request);
    for (const request of await previewAndApply(textSpec('new example'))) {
      expect(request.body.text).toBe('new example');
    }

    writeStoredSpec(textSpec('old example'));
    writeUserRequestFrom(textSpec('old example'), (request) => ({ ...request, body: { ...request.body, text: 'my text' } }));
    for (const request of await previewAndApply(textSpec('new example'))) {
      expect(request.body.text).toBe('my text');
    }
  });

  it('keeps a picked file with its content type and a disabled field in a multipart body', async () => {
    const multipartSpec = (properties) => createPetSpec({ requestBody: { content: { 'multipart/form-data': { schema: objectSchema(properties) } } } });
    const previous = multipartSpec({ avatar: { type: 'string', format: 'binary' }, note: string });
    writeStoredSpec(previous);
    writeUserRequestFrom(previous, (request) => ({
      ...request,
      body: {
        ...request.body,
        multipartForm: request.body.multipartForm.map((f) => (f.name === 'avatar' ? { ...f, value: ['/tmp/rex.png'], contentType: 'image/png' } : { ...f, value: 'hi', enabled: false }))
      }
    }));

    for (const request of await previewAndApply(multipartSpec({ avatar: { type: 'string', format: 'binary' }, note: string, tag: string }))) {
      const byName = Object.fromEntries(request.body.multipartForm.map((f) => [f.name, f]));
      expect(Object.keys(byName).sort()).toEqual(['avatar', 'note', 'tag']);
      expect(byName.avatar).toMatchObject({ type: 'file', value: ['/tmp/rex.png'], contentType: 'image/png' });
      expect(byName.note).toMatchObject({ type: 'text', value: 'hi', enabled: false });
      expect(byName.tag).toMatchObject({ type: 'text', value: '' });
    }
  });

  it('keeps a header the user added and disabled, and the enabled state of the spec header', async () => {
    const previous = formSpec({ name: string }, 'X-Trace');
    writeStoredSpec(previous);
    writeUserRequestFrom(previous, (request) => ({
      ...request,
      headers: [...request.headers.map((h) => ({ ...h, value: 'trace-1', enabled: true })), { name: 'X-Debug', value: '1', enabled: false }]
    }));

    for (const request of await previewAndApply(formSpec({ name: string, age: { type: 'integer' } }, 'X-Trace'))) {
      const headers = request.headers.map(({ name, value, enabled }) => [name, value, enabled !== false]).sort(([a], [b]) => a.localeCompare(b));
      expect(headers).toEqual([['X-Debug', '1', false], ['X-Trace', 'trace-1', true]]);
    }
  });

  it('writes the enabled query params into the url, and finds the request again on the next sync', async () => {
    const querySpec = (names) => createPetSpec({ parameters: names.map((name) => ({ name, in: 'query', schema: string })) });
    const previous = querySpec(['status', 'limit']);
    const next = querySpec(['status', 'limit', 'sort']);
    const base = openApiToBruno(next).items[0].request.url;
    writeStoredSpec(previous);
    writeUserRequestFrom(previous, (request) => ({
      ...request,
      url: `${request.url}?status=sold&debug=1`,
      params: [...request.params.map((p) => (p.name === 'status' ? { ...p, value: 'sold', enabled: true } : p)), { name: 'debug', value: '1', type: 'query', enabled: true }]
    }));

    const [, applied] = await previewAndApply(next);
    expect(applied.url).toBe(`${base}?status=sold&debug=1`);

    await apply(next, { added: [{ method: 'POST', path: '/pets' }] });
    const requestFiles = fs.readdirSync(collectionPath).filter((file) => file.endsWith(`.${format}`) && !file.startsWith('opencollection'));
    expect(requestFiles).toEqual([`Create pet.${format}`]);
    expect(readRequest().url).toBe(`${base}?status=sold&debug=1`);
  });

  it('treats a raw body saved with Windows line endings as unedited', async () => {
    writeStoredSpec(textSpec('old example\nsecond line'));
    writeUserRequestFrom(textSpec('old example\nsecond line'), (request) => request);
    fs.writeFileSync(requestFile, fs.readFileSync(requestFile, 'utf8').replace(/\r?\n/g, '\r\n'));

    const [previewed, applied] = await previewAndApply(textSpec('new example'));
    expect(previewed.body.text).toBe('new example');
    expect(applied.body.text).toBe('new example');
  });

  it('compares each endpoint with its own previous spec when one sync changes several endpoints', async () => {
    const operation = (summary, properties) => ({ post: { summary, requestBody: jsonBody(objectSchema(properties)), responses: OK } });
    const petsAndOwners = (petProperties, ownerProperties) => ({
      openapi: '3.0.3',
      info: { title: 'Pets', version: '1' },
      paths: { '/pets': operation('Create pet', petProperties), '/owners': operation('Create owner', ownerProperties) }
    });
    const previous = petsAndOwners({ name: string, legacy: string }, { email: string });
    const next = petsAndOwners({ name: string, age: { type: 'integer' } }, { email: string, phone: string });
    const ownerFile = path.join(collectionPath, `Create owner.${format}`);
    writeStoredSpec(previous);
    writeUserRequestFrom(previous, withJsonBody({ name: 'Rex', legacy: 'x', debug: true }));
    writeUserRequestFrom(previous, withJsonBody({ email: 'a@b.c', legacy: 'y' }), { name: 'Create owner', file: ownerFile });
    const previewedBody = async (endpointId) => JSON.parse((await preview(next, { endpointId })).newData.request.body.json);
    const expectedPet = { name: 'Rex', age: 0, debug: true };
    const expectedOwner = { email: 'a@b.c', phone: '', legacy: 'y' };

    expect(await previewedBody('POST:/pets')).toEqual(expectedPet);
    expect(await previewedBody('POST:/owners')).toEqual(expectedOwner);
    await apply(next, { modified: [{ method: 'POST', path: '/pets' }, { method: 'POST', path: '/owners' }] });
    expect(JSON.parse(readRequest().body.json)).toEqual(expectedPet);
    expect(JSON.parse(readRequest(ownerFile).body.json)).toEqual(expectedOwner);
  });
});
