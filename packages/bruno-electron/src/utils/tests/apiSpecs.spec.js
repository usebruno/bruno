const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseApiSpecContent, resolveExternalApiSpecRefs } = require('../apiSpecs');

describe('parseApiSpecContent', () => {
  it('parses yaml and json by extension', () => {
    expect(parseApiSpecContent('openapi: 3.1.0', '.yaml')).toEqual({ openapi: '3.1.0' });
    expect(parseApiSpecContent('openapi: 3.1.0', '.YML')).toEqual({ openapi: '3.1.0' });
    expect(parseApiSpecContent('{"openapi":"3.1.0"}', '.json')).toEqual({ openapi: '3.1.0' });
  });

  it('returns null for unknown extensions and unparseable content', () => {
    expect(parseApiSpecContent('openapi: 3.1.0', '.txt')).toBeNull();
    expect(parseApiSpecContent('{oops', '.json')).toBeNull();
  });
});

describe('resolveExternalApiSpecRefs', () => {
  let specDir;

  const writeSpecFile = (filename, content) => {
    const filePath = path.join(specDir, filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  beforeEach(() => {
    specDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-api-spec-'));
  });

  afterEach(() => {
    fs.rmSync(specDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  });

  it('inlines a file referenced relative to the spec, not the process cwd', async () => {
    writeSpecFile('endpoint.yaml', 'get:\n  operationId: hello\n');
    const specPath = writeSpecFile('openapi.yaml', '');

    const { resolvedJson: resolved } = await resolveExternalApiSpecRefs(
      { openapi: '3.1.0', paths: { '/hello': { $ref: './endpoint.yaml' } } },
      specPath
    );

    expect(resolved.paths['/hello']).toEqual({ get: { operationId: 'hello' } });
  });

  it('inlines refs from a nested directory and rebases their internal pointers', async () => {
    writeSpecFile('schemas/hello.yaml', 'Hello:\n  type: object\nGreeting:\n  $ref: "#/Hello"\n');
    const specPath = writeSpecFile('openapi.yaml', '');

    const { resolvedJson: resolved } = await resolveExternalApiSpecRefs(
      {
        openapi: '3.1.0',
        components: {
          schemas: {
            Hello: { $ref: './schemas/hello.yaml#/Hello' },
            Greeting: { $ref: './schemas/hello.yaml#/Greeting' }
          }
        }
      },
      specPath
    );

    expect(resolved.components.schemas.Hello).toEqual({ type: 'object' });
    expect(resolved.components.schemas.Greeting).toEqual({ $ref: '#/components/schemas/Hello' });
  });

  it('leaves the document it is given untouched', async () => {
    writeSpecFile('endpoint.yaml', 'get:\n  operationId: hello\n');
    const specPath = writeSpecFile('openapi.yaml', '');
    const json = { openapi: '3.1.0', paths: { '/hello': { $ref: './endpoint.yaml' } } };

    await resolveExternalApiSpecRefs(json, specPath);

    expect(json.paths['/hello']).toEqual({ $ref: './endpoint.yaml' });
  });

  it('follows a ref chain through a third file', async () => {
    writeSpecFile('shared.yaml', 'Ok:\n  description: ok\n');
    writeSpecFile('endpoint.yaml', 'get:\n  responses:\n    "200":\n      $ref: "./shared.yaml#/Ok"\n');
    const specPath = writeSpecFile('openapi.yaml', '');

    const { resolvedJson: resolved } = await resolveExternalApiSpecRefs(
      { openapi: '3.1.0', paths: { '/hello': { $ref: './endpoint.yaml' } } },
      specPath
    );

    expect(resolved.paths['/hello'].get.responses['200']).toEqual({ description: 'ok' });
  });

  it('turns a ref cycle across files into an internal ref the renderer can receive', async () => {
    writeSpecFile('endpoint.yaml', 'get:\n  responses:\n    "200":\n      $ref: "./openapi.yaml#/paths/~1hello"\n');
    const specPath = writeSpecFile('openapi.yaml', 'paths:\n  /hello:\n    $ref: "./endpoint.yaml"\n');

    const { resolvedJson: resolved } = await resolveExternalApiSpecRefs(
      { openapi: '3.1.0', paths: { '/hello': { $ref: './endpoint.yaml' } } },
      specPath
    );

    expect(resolved.paths['/hello'].get.responses['200']).toEqual({ $ref: '#/paths/~1hello' });
    expect(() => JSON.stringify(resolved)).not.toThrow();
  });

  it('returns null when there is nothing external to inline', async () => {
    const specPath = writeSpecFile('openapi.yaml', '');
    const internalOnly = {
      openapi: '3.1.0',
      paths: { '/hello': { get: { responses: { 200: { $ref: '#/components/responses/Ok' } } } } }
    };

    expect((await resolveExternalApiSpecRefs(internalOnly, specPath)).resolvedJson).toBeNull();
    expect((await resolveExternalApiSpecRefs(null, specPath)).resolvedJson).toBeNull();
  });

  it('leaves refs the parser cannot follow alone', async () => {
    const specPath = writeSpecFile('openapi.yaml', '');
    const remoteRef = { openapi: '3.1.0', paths: { '/hello': { $ref: 'https://example.com/endpoint.yaml' } } };
    // An OpenAPI 3.1 `$ref` to an in-document `$id` is indistinguishable from a relative file path.
    const idRef = {
      openapi: '3.1.0',
      components: { schemas: { Hello: { $id: 'hello.json', type: 'object' }, Greeting: { $ref: 'hello.json' } } }
    };

    expect((await resolveExternalApiSpecRefs(remoteRef, specPath)).resolvedJson).toBeNull();
    expect((await resolveExternalApiSpecRefs(idRef, specPath)).resolvedJson).toBeNull();
  });

  it('inlines what it can when one ref among several is unresolvable', async () => {
    writeSpecFile('endpoint.yaml', 'get:\n  operationId: hello\n');
    const specPath = writeSpecFile('openapi.yaml', '');

    const { resolvedJson: resolved } = await resolveExternalApiSpecRefs(
      {
        openapi: '3.1.0',
        paths: {
          '/hello': { $ref: './endpoint.yaml' },
          '/missing': { $ref: './deleted.yaml' }
        }
      },
      specPath
    );

    expect(resolved.paths['/hello']).toEqual({ get: { operationId: 'hello' } });
    expect(resolved.paths['/missing']).toEqual({ $ref: './deleted.yaml' });
  });

  it('does not hang on a self-referencing document', async () => {
    const specPath = writeSpecFile('openapi.yaml', '');
    const json = { openapi: '3.1.0', components: {} };
    json.components.self = json;

    expect((await resolveExternalApiSpecRefs(json, specPath)).resolvedJson).toBeNull();
  });
});
