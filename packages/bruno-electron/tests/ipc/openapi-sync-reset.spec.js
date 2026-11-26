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
const recipient = { type: 'object', properties: { email: string } };
const message = { oneOf: [{ type: 'object', properties: { kind: string, data: { type: 'object', properties: { id: string } } } }, { type: 'object', properties: { kind: string, data: string } }] };

const petSpec = {
  openapi: '3.0.3',
  info: { title: 'Pets', version: '1' },
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
  paths: {
    '/pets': {
      post: {
        summary: 'Create pet',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'X-Request-Id', in: 'header', schema: string }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: string, nickname: string, owner: { type: 'object', properties: { id: { type: 'integer' } } } } }
            }
          }
        },
        responses: OK
      }
    },
    '/pets/{petId}/photo': {
      post: {
        summary: 'Upload photo',
        parameters: [{ name: 'petId', in: 'path', required: true, schema: string }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { photo: { type: 'string', format: 'binary' }, caption: string } }
            }
          }
        },
        responses: OK
      }
    },
    '/mail': {
      post: {
        summary: 'Send mail',
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { subject: string, to: { anyOf: [recipient, { type: 'array', items: recipient }] }, payload: message } }
            }
          }
        },
        responses: OK
      }
    },
    '/recipients': {
      post: {
        summary: 'Add recipients',
        requestBody: { content: { 'application/json': { schema: { anyOf: [recipient, { type: 'array', items: recipient }] } } } },
        responses: OK
      }
    }
  }
};

const editCreatePet = (request) => ({
  ...request,
  url: '{{baseUrl}}/pets?limit={{pageSize}}',
  params: request.params.map((param) => (param.name === 'limit' ? { ...param, value: '{{pageSize}}' } : param)),
  headers: [
    ...request.headers.map((header) => (header.name === 'X-Request-Id' ? { ...header, value: '{{requestId}}', enabled: true } : header)),
    { name: 'X-Debug', value: '1', enabled: true }
  ],
  body: { ...request.body, json: JSON.stringify({ name: 'Fido', owner: { id: 7 } }), text: 'Saved text' },
  auth: { ...request.auth, bearer: { token: 'my-secret' }, basic: { username: 'me', password: 'secret' } },
  docs: 'My notes',
  script: { req: 'bru.setVar(\'ready\', true);', res: 'bru.setVar(\'petId\', res.body.id);' },
  tests: 'test(\'works\', () => {});',
  vars: { req: [{ name: 'petName', value: 'Fido', enabled: true }], res: [{ name: 'petId', value: 'res.body.id', enabled: true }] },
  assertions: [{ name: 'res.status', value: 'eq 200', enabled: true }]
});

const namesAndValues = (entries) => entries.map(({ name, value }) => [name, value]);

const withoutUids = (value) => JSON.parse(JSON.stringify(value, (key, entry) => (key === 'uid' || key === 'itemUid' ? undefined : entry)));

const blocksOfOtherModes = ({ mode, ...blocks }) => Object.fromEntries(Object.entries(blocks).filter(([key]) => key !== mode));

const keptByReset = ({ seq, tags, settings, examples, request }) => withoutUids({
  seq,
  tags,
  settings,
  examples,
  docs: request.docs,
  script: request.script,
  tests: request.tests,
  vars: request.vars,
  assertions: request.assertions,
  otherAuthModes: blocksOfOtherModes(request.auth),
  otherBodyModes: blocksOfOtherModes(request.body)
});

const shownRequest = ({ request }) => withoutUids({
  url: request.url,
  params: request.params,
  headers: request.headers,
  body: { mode: request.body.mode, content: request.body[request.body.mode] },
  auth: { mode: request.auth.mode, content: request.auth[request.auth.mode] },
  docs: request.docs,
  vars: request.vars,
  assertions: request.assertions,
  script: request.script,
  tests: request.tests
});

describe.each(['bru', 'yml'])('Collection Changes reset in a %s collection', (format) => {
  let collectionPath;

  const fileOf = (name) => path.join(collectionPath, `${name}.${format}`);

  const writeStoredSpec = (spec) => {
    const specsDir = path.join(mockUserData, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, 'stored.json'), JSON.stringify(spec));
    fs.writeFileSync(path.join(specsDir, 'metadata.json'), JSON.stringify({ [collectionPath]: [{ filename: 'stored.json', sourceUrl: SOURCE_URL }] }));
  };

  const writeRequest = (name, edit = (request) => request, fileName = name) => {
    const item = openApiToBruno(petSpec).items.find((each) => each.name === name);
    item.request = edit(item.request);
    fs.writeFileSync(fileOf(fileName), stringifyRequest(item, { format }));
  };

  const readItem = (name) => parseRequest(fs.readFileSync(fileOf(name), 'utf8'), { format });

  const readRequest = (name) => readItem(name).request;

  const drift = () => ipcMain._getHandler('renderer:get-collection-drift')({}, { collectionPath });

  const modifiedEndpoints = async () => (await drift()).modified;

  const reset = (endpoints, options = {}) => ipcMain._getHandler('renderer:reset-endpoints-to-spec')({}, { collectionPath, endpoints, ...options });

  const previewReset = (endpointId, { newSpec, pathname } = {}) =>
    ipcMain._getHandler('renderer:get-endpoint-diff-data')({}, { collectionPath, endpointId, pathname, newSpec, resetToSpec: true });

  beforeEach(() => {
    mockUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-reset-user-data-'));
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-reset-collection-'));
    const config = { version: '1', name: 'Pets', type: 'collection', openapi: [{ sourceUrl: SOURCE_URL, groupBy: 'tags' }] };
    if (format === 'yml') {
      fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), stringifyCollection({}, { ...config, opencollection: '1.0.0' }, { format }));
    } else {
      fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify(config));
    }
    registerOpenAPISyncIpc({ webContents: { send: jest.fn() } });
    writeStoredSpec(petSpec);
    writeRequest('Upload photo');
  });

  afterEach(() => {
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    fs.rmSync(mockUserData, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('restores the spec\'s fields and keeps the user\'s values and everything else the request has', async () => {
    const item = openApiToBruno(petSpec).items.find((each) => each.name === 'Create pet');
    const settings = { encodeUrl: false, timeout: 5000, followRedirects: false, maxRedirects: 3 };
    const example = {
      type: 'http-request',
      name: 'Created',
      description: 'Saved response',
      request: { method: 'POST', url: '{{baseUrl}}/pets', headers: [], params: [], body: { mode: 'json', json: '{"name": "Rex"}' } },
      response: { status: 201, statusText: 'Created', headers: [], body: { type: 'json', content: '{"id": 1}' } }
    };
    fs.writeFileSync(fileOf('Create pet'), stringifyRequest({ ...item, seq: 7, tags: ['pets', 'smoke'], settings, examples: [example], request: editCreatePet(item.request) }, { format }));
    const kept = keptByReset(readItem('Create pet'));
    expect(kept).toMatchObject({ seq: 7, tags: ['pets', 'smoke'], settings, examples: [expect.objectContaining({ name: 'Created' })] });

    await reset(await modifiedEndpoints());

    const request = readRequest('Create pet');
    expect(namesAndValues(request.headers)).toEqual([['X-Request-Id', '{{requestId}}']]);
    expect(namesAndValues(request.params)).toEqual([['limit', '{{pageSize}}']]);
    expect(request.url).toBe('{{baseUrl}}/pets?limit={{pageSize}}');
    expect(JSON.parse(request.body.json)).toEqual({ name: 'Fido', nickname: '', owner: { id: 7 } });
    expect(request.auth).toMatchObject({ mode: 'bearer', bearer: { token: 'my-secret' } });
    expect(keptByReset(readItem('Create pet'))).toEqual(kept);
  });

  it('takes the spec\'s auth when the user changed the auth mode', async () => {
    writeRequest('Create pet', (request) => ({ ...request, auth: { mode: 'basic', basic: { username: 'me', password: 'secret' } } }));

    await reset(await modifiedEndpoints());

    expect(readRequest('Create pet').auth).toMatchObject({ mode: 'bearer', bearer: { token: '{{token}}' } });
  });

  it('takes the spec\'s field for a body field the user changed to another type', async () => {
    writeRequest('Create pet', (request) => ({ ...request, body: { ...request.body, json: JSON.stringify({ name: 'Fido', nickname: 'Rex', owner: 'seven' }) } }));
    writeRequest('Upload photo', (request) => ({
      ...request,
      body: {
        ...request.body,
        multipartForm: request.body.multipartForm.map((field) => (field.name === 'photo' ? { ...field, type: 'text', value: 'not a file' } : { ...field, value: 'Sunny' }))
      }
    }));

    await reset(await modifiedEndpoints());

    expect(JSON.parse(readRequest('Create pet').body.json)).toEqual({ name: 'Fido', nickname: 'Rex', owner: { id: 0 } });
    expect(readRequest('Upload photo').body.multipartForm.map(({ name, type }) => [name, type])).toEqual([['photo', 'file'], ['caption', 'text']]);
    expect(readRequest('Upload photo').body.multipartForm.find(({ name }) => name === 'caption').value).toBe('Sunny');
  });

  it('resets every modified endpoint the same way when several are reset at once', async () => {
    writeRequest('Create pet', editCreatePet);
    writeRequest('Upload photo', (request) => ({
      ...request,
      headers: [{ name: 'X-Debug', value: '1', enabled: true }],
      body: { ...request.body, multipartForm: request.body.multipartForm.map((field) => (field.name === 'caption' ? { ...field, value: 'Sunny' } : field)) }
    }));
    expect((await modifiedEndpoints()).map(({ id }) => id).sort()).toEqual(['POST:/pets', 'POST:/pets/:petId/photo']);

    await reset(await modifiedEndpoints());

    expect(namesAndValues(readRequest('Create pet').headers)).toEqual([['X-Request-Id', '{{requestId}}']]);
    expect(readRequest('Upload photo').headers).toEqual([]);
    expect(readRequest('Upload photo').body.multipartForm.find(({ name }) => name === 'caption').value).toBe('Sunny');
  });

  it('writes exactly what the Collection Changes preview shows, from the stored spec', async () => {
    writeRequest('Create pet', editCreatePet);
    const preview = await previewReset('POST:/pets', { newSpec: { ...petSpec, paths: {} } });

    await reset(await modifiedEndpoints());

    expect(shownRequest((await previewReset('POST:/pets', { newSpec: petSpec })).oldData)).toEqual(shownRequest(preview.newData));
  });

  it('previews each copy of a duplicated request from its own file, as Reset writes it', async () => {
    const withRequestId = (value) => (request) => ({
      ...request,
      headers: [...request.headers.map((header) => (header.name === 'X-Request-Id' ? { ...header, value, enabled: true } : header)), { name: 'X-Debug', value: '1', enabled: true }]
    });
    writeRequest('Create pet', withRequestId('{{requestId}}'));
    writeRequest('Create pet', withRequestId('{{copyId}}'), 'Create pet copy');
    const endpoints = await modifiedEndpoints();
    const previews = await Promise.all(endpoints.map(({ id, pathname }) => previewReset(id, { pathname })));

    await reset(endpoints);

    const written = endpoints.map(({ pathname }) => namesAndValues(parseRequest(fs.readFileSync(pathname, 'utf8'), { format }).request.headers));
    expect(written.map(([[, value]]) => value).sort()).toEqual(['{{copyId}}', '{{requestId}}']);
    expect(previews.map(({ newData }) => namesAndValues(newData.request.headers))).toEqual(written);
  });

  it('does not read or reset a request file outside the collection', async () => {
    const outside = path.join(mockUserData, `Create pet.${format}`);
    const item = openApiToBruno(petSpec).items.find((each) => each.name === 'Create pet');
    item.request.headers.push({ name: 'X-Debug', value: '1', enabled: true });
    fs.writeFileSync(outside, stringifyRequest(item, { format }));
    const content = fs.readFileSync(outside, 'utf8');

    expect(await previewReset('POST:/pets', { pathname: outside })).toEqual({ error: 'Request file is outside the collection' });
    expect(await reset([{ id: 'POST:/pets', method: 'POST', path: '/pets', pathname: outside }])).toEqual({ success: true, resetCount: 0 });
    expect(fs.readFileSync(outside, 'utf8')).toBe(content);
  });

  it('takes the spec\'s body for a JSON body that is null, so the endpoint is no longer listed', async () => {
    writeRequest('Create pet', (request) => ({ ...request, body: { ...request.body, json: 'null' } }));
    expect((await modifiedEndpoints()).map(({ id, changes }) => [id, changes])).toEqual([['POST:/pets', 'body schema']]);
    const preview = await previewReset('POST:/pets');

    await reset(await modifiedEndpoints());

    const specBody = { name: '', nickname: '', owner: { id: 0 } };
    expect(JSON.parse(readRequest('Create pet').body.json)).toEqual(specBody);
    expect(JSON.parse(preview.newData.request.body.json)).toEqual(specBody);
    expect((await drift()).modified).toEqual([]);
  });

  it('no longer lists the endpoints in Collection Changes after Reset', async () => {
    writeRequest('Create pet', editCreatePet);
    writeRequest('Upload photo', (request) => ({
      ...request,
      body: { ...request.body, multipartForm: request.body.multipartForm.map((field) => (field.name === 'photo' ? { ...field, type: 'text', value: 'x' } : field)) }
    }));

    await reset(await modifiedEndpoints());

    const after = await drift();
    expect(after.modified).toEqual([]);
    expect(after.inSync.map(({ id }) => id).sort()).toEqual(['POST:/pets', 'POST:/pets/:petId/photo']);
  });

  it('takes the spec\'s method back when the file\'s method changed after the endpoint was listed', async () => {
    const withDebugHeader = (request) => ({ ...request, headers: [...request.headers, { name: 'X-Debug', value: '1', enabled: true }] });
    writeRequest('Create pet', withDebugHeader);
    const listed = await modifiedEndpoints();
    writeRequest('Create pet', (request) => ({ ...withDebugHeader(request), method: 'PUT' }));
    const preview = await previewReset('POST:/pets', { pathname: listed[0].pathname });

    await reset(listed);

    expect(readRequest('Create pet').method).toBe('POST');
    expect(preview.newData.request.method).toBe('POST');
    const after = await drift();
    expect(after.localOnly).toEqual([]);
    expect(after.inSync.map(({ id }) => id)).toContain('POST:/pets');
  });

  it.each([
    ['a JSON object', '{\n  "name": "Fido",\n  "owner": {{owner}}\n}', '{\n  "name": "Fido",\n  "nickname": "",\n  "owner": {{owner}}\n}'],
    ['the whole body', '{{payload}}', '{{payload}}']
  ])('keeps a {{var}} written in place of %s, as the preview shows', async (_, json, expected) => {
    writeRequest('Create pet', (request) => ({
      ...request,
      headers: [...request.headers, { name: 'X-Debug', value: '1', enabled: true }],
      body: { ...request.body, json }
    }));
    const preview = await previewReset('POST:/pets');

    await reset(await modifiedEndpoints());

    const request = readRequest('Create pet');
    expect(request.headers.map(({ name }) => name)).toEqual(['X-Request-Id']);
    expect(request.body.json).toBe(expected);
    expect(preview.newData.request.body.json).toBe(expected);
    expect((await drift()).modified).toEqual([]);
  });

  it('restores a field of another type next to a {{var}} that Reset removes, so the endpoint is no longer listed', async () => {
    writeRequest('Create pet', (request) => ({
      ...request,
      headers: [...request.headers, { name: 'X-Debug', value: '1', enabled: true }],
      body: { ...request.body, json: '{"name": "Fido", "owner": "seven", "junk": {{junk}}}' }
    }));
    const preview = await previewReset('POST:/pets');

    await reset(await modifiedEndpoints());

    const expected = { name: 'Fido', nickname: '', owner: { id: 0 } };
    expect(JSON.parse(readRequest('Create pet').body.json)).toEqual(expected);
    expect(JSON.parse(preview.newData.request.body.json)).toEqual(expected);
    expect((await drift()).modified).toEqual([]);
  });

  it('keeps a JSON body as written when Reset leaves its values as they are', async () => {
    writeRequest('Create pet', (request) => ({
      ...request,
      headers: [...request.headers, { name: 'X-Debug', value: '1', enabled: true }],
      body: { ...request.body, json: '{\n    "owner": { "id": 9007199254740993 },\n    "name": "Fido",\n    "nickname": "Rex"\n}' }
    }));
    const written = readRequest('Create pet').body.json;
    const preview = await previewReset('POST:/pets');

    await reset(await modifiedEndpoints());

    expect(readRequest('Create pet').headers.map(({ name }) => name)).toEqual(['X-Request-Id']);
    expect(readRequest('Create pet').body.json).toBe(written);
    expect(preview.newData.request.body.json).toBe(written);
  });

  it('keeps a oneOf or anyOf part as written, and no longer lists the endpoint after Reset', async () => {
    const body = { subject: 'Hi', to: [{ email: 'a@x.io' }, { email: 'b@x.io' }], payload: { kind: 'b', data: 'hello' } };
    writeRequest('Send mail', (request) => ({
      ...request,
      headers: [{ name: 'X-Debug', value: '1', enabled: true }],
      body: { ...request.body, json: JSON.stringify(body, null, 2) }
    }));
    expect((await modifiedEndpoints()).map(({ id, changes }) => [id, changes])).toEqual([['POST:/mail', '+1 headers']]);

    await reset(await modifiedEndpoints());

    const request = readRequest('Send mail');
    expect(request.headers).toEqual([]);
    expect(JSON.parse(request.body.json)).toEqual(body);
    expect((await drift()).modified).toEqual([]);
  });

  it('keeps a body the spec allows in another shape than its example, and no longer lists the endpoint after Reset', async () => {
    const recipients = [{ email: 'a@x.io' }, { email: 'b@x.io' }];
    writeRequest('Add recipients', (request) => ({
      ...request,
      headers: [{ name: 'X-Debug', value: '1', enabled: true }],
      body: { ...request.body, json: JSON.stringify(recipients, null, 2) }
    }));
    expect((await modifiedEndpoints()).map(({ id, changes }) => [id, changes])).toEqual([['POST:/recipients', '+1 headers']]);
    const preview = await previewReset('POST:/recipients');

    await reset(await modifiedEndpoints());

    expect(JSON.parse(readRequest('Add recipients').body.json)).toEqual(recipients);
    expect(JSON.parse(preview.newData.request.body.json)).toEqual(recipients);
    expect((await drift()).modified).toEqual([]);
  });

  it('replaces the values with the spec\'s for Revert All to Spec, and keeps the scripts', async () => {
    writeRequest('Create pet', editCreatePet);

    await reset(await modifiedEndpoints(), { fullReset: true });

    const request = readRequest('Create pet');
    expect(namesAndValues(request.headers)).toEqual([['X-Request-Id', '']]);
    expect(namesAndValues(request.params)).toEqual([['limit', '10']]);
    expect(JSON.parse(request.body.json)).toEqual({ name: '', nickname: '', owner: { id: 0 } });
    expect(request.auth).toMatchObject({ mode: 'bearer', bearer: { token: '{{token}}' } });
    expect(request.script.req).toContain('bru.setVar(\'ready\', true);');
    expect((await drift()).modified).toEqual([]);
  });
});
