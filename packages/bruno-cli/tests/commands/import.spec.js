const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const { builder, handler, resolveLocalWsdlSchemaRef } = require('../../src/commands/import');

// Mirrors bruno-electron/tests/ipc/wsdl.test.js
describe('resolveLocalWsdlSchemaRef', () => {
  let dir;
  let wsdlPath;
  let commonPath;

  beforeAll(() => {
    dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-wsdl-')));
    fs.mkdirSync(path.join(dir, 'wsdl'));
    fs.mkdirSync(path.join(dir, 'schema'));
    wsdlPath = path.join(dir, 'wsdl', 'Service.wsdl');
    commonPath = path.join(dir, 'schema', 'Common.xsd');
    fs.writeFileSync(wsdlPath, '<definitions/>');
    fs.writeFileSync(commonPath, '<schema/>');
    fs.writeFileSync(path.join(dir, 'secret.txt'), 'SECRET');
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('joins a ref against an absolute path base and against a file:// base', async () => {
    const firstHop = await resolveLocalWsdlSchemaRef(wsdlPath, '../schema/Common.xsd');

    expect(firstHop.text).toBe('<schema/>');
    expect(firstHop.uri).toBe(pathToFileURL(commonPath).href);
    expect(firstHop.key).toBe(pathToFileURL(commonPath).href);

    const secondHop = await resolveLocalWsdlSchemaRef(firstHop.uri, '../wsdl/Service.wsdl');

    expect(secondHop.text).toBe('<definitions/>');
    expect(secondHop.uri).toBe(pathToFileURL(wsdlPath).href);
    expect(secondHop.key).toBe(pathToFileURL(wsdlPath).href);
  });

  it('refuses a ref pointing at a non-schema file', async () => {
    await expect(resolveLocalWsdlSchemaRef(wsdlPath, '../secret.txt')).rejects.toThrow(
      /must point at a .xsd\/.wsdl file/
    );
  });

  it('rejects a non-string base uri', async () => {
    await expect(resolveLocalWsdlSchemaRef(undefined, '../schema/Common.xsd')).rejects.toThrow(
      /Invalid base URI/
    );
  });

  it('rejects a non-string schema reference', async () => {
    await expect(resolveLocalWsdlSchemaRef(wsdlPath, undefined)).rejects.toThrow(/Invalid schema reference/);
  });
});

const registeredOptions = () => {
  const options = {};
  const yargs = {
    positional: () => yargs,
    example: () => yargs,
    option: (name, config) => {
      options[name] = config;
      return yargs;
    }
  };
  builder(yargs);
  return options;
};

describe('import openapi', () => {
  const ordersSpec = {
    openapi: '3.0.3',
    info: { title: 'Orders', version: '1.0' },
    servers: [{ url: 'https://example.com' }],
    security: [{ bearerAuth: [] }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
    paths: { '/orders': { get: { security: [{ bearerAuth: [] }], responses: { 200: { description: 'OK' } } } } }
  };
  const swaggerOrdersSpec = {
    swagger: '2.0',
    info: { title: 'Orders', version: '1.0' },
    host: 'example.com',
    securityDefinitions: { basicAuth: { type: 'basic' } },
    security: [{ basicAuth: [] }],
    paths: { '/orders': { get: { security: [{ basicAuth: [] }], responses: { 200: { description: 'OK' } } } } }
  };
  const petsSpec = {
    openapi: '3.0.3',
    info: { title: 'Pets', version: '1.0' },
    servers: [{ url: 'https://example.com' }],
    paths: {
      '/pets/{petId}': {
        get: { summary: 'Find pet by ID', operationId: 'getPetById', description: 'Returns a single pet.', responses: { 200: { description: 'OK' } } }
      },
      '/pets': {
        get: { responses: { 200: { description: 'OK' } } }
      }
    }
  };
  let dir;
  let importCount = 0;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-import-openapi-'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  const importOpenApi = async (spec, flags) => {
    importCount += 1;
    const source = path.join(dir, `spec-${importCount}.json`);
    const outputFile = path.join(dir, `collection-${importCount}.json`);
    fs.writeFileSync(source, JSON.stringify(spec));
    await handler({ type: 'openapi', source, outputFile, collectionFormat: 'opencollection', groupBy: 'tags', insecure: false, ...flags });
    return JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  };

  describe('--auth-placement', () => {
    it('registers the flag with request and collection, request by default', () => {
      expect(registeredOptions()['auth-placement']).toMatchObject({ type: 'string', choices: ['request', 'collection'], default: 'request' });
    });

    it('puts the security scheme on the collection and lets the request inherit it', async () => {
      const collection = await importOpenApi(ordersSpec, { authPlacement: 'collection' });

      expect(collection.root.request.auth.mode).toBe('bearer');
      expect(collection.items[0].request.auth.mode).toBe('inherit');
    });

    it('keeps the auth on the request with request placement', async () => {
      const collection = await importOpenApi(ordersSpec, { authPlacement: 'request' });

      expect(collection.items[0].request.auth.mode).toBe('bearer');
    });

    it('applies the flag to Swagger 2.0 specs', async () => {
      const collection = await importOpenApi(swaggerOrdersSpec, { authPlacement: 'collection' });

      expect(collection.root.request.auth.mode).toBe('basic');
      expect(collection.items[0].request.auth.mode).toBe('inherit');
    });
  });

  describe('--request-name-source', () => {
    it('registers the flag with the four sources and summary as the default', () => {
      expect(registeredOptions()['request-name-source']).toMatchObject({
        type: 'string',
        choices: ['summary', 'operationId', 'description', 'path'],
        default: 'summary'
      });
    });

    it.each([
      ['summary', ['Find pet by ID', 'GET /pets']],
      ['operationId', ['getPetById', 'GET /pets']],
      ['description', ['Returns a single pet', 'GET /pets']],
      ['path', ['GET /pets/{petId}', 'GET /pets']]
    ])('names requests from %s, falling back to method and path', async (requestNameSource, names) => {
      const collection = await importOpenApi(petsSpec, { requestNameSource });

      expect(collection.items.map((item) => item.name)).toEqual(names);
    });
  });
});
