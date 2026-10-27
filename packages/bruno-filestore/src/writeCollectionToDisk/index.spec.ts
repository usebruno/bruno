import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseRequest, parseFolder, parseEnvironment } from '../index';
import { writeCollectionToDisk, writeCollectionToDiskLegacy } from './index';
import type { CollectionFormat } from '../types';

const FORMATS: CollectionFormat[] = ['bru', 'yml'];

const httpItem = (overrides: Record<string, any> = {}) => ({
  type: 'http-request',
  name: 'Get Users',
  seq: 1,
  request: {
    method: 'GET',
    url: 'https://api.example.com/users'
  },
  ...overrides
});

const collectionWith = (fields: Record<string, any>): any => ({
  name: 'Imported Collection',
  items: [],
  ...fields
});

describe('writeCollectionToDisk methods', () => {
  let tempDir: string;
  let outputDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-filestore-write-'));
    outputDir = path.join(tempDir, 'collection');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const read = (...segments: string[]) => fs.readFileSync(path.join(outputDir, ...segments), 'utf8');

  describe.each(FORMATS)('%s format', (format) => {
    const write = (collection: any) => writeCollectionToDiskLegacy(collection, outputDir, { format });
    const readRequest = (...segments: string[]) => parseRequest(read(...segments), { format });

    it('writes http and graphql requests', async () => {
      await write(collectionWith({
        items: [
          httpItem({ filename: `get-users.${format}` }),
          {
            type: 'graphql-request',
            name: 'Get Viewer',
            filename: `get-viewer.${format}`,
            seq: 2,
            request: {
              method: 'POST',
              url: 'https://api.example.com/graphql',
              body: {
                mode: 'graphql',
                graphql: { query: 'query { viewer { id } }', variables: '{}' }
              }
            }
          }
        ]
      }));

      const httpRequest = readRequest(`get-users.${format}`);
      const graphqlRequest = readRequest(`get-viewer.${format}`);

      expect(httpRequest).toHaveProperty('type', 'http-request');
      expect(httpRequest).toHaveProperty('request.method', 'GET');
      expect(httpRequest).toHaveProperty('request.url', 'https://api.example.com/users');
      expect(graphqlRequest).toHaveProperty('type', 'graphql-request');
      expect(graphqlRequest).toHaveProperty('request.method', 'POST');
      expect(graphqlRequest).toHaveProperty('request.body.graphql.query', 'query { viewer { id } }');
    });

    it('writes grpc and websocket requests', async () => {
      await write(collectionWith({
        items: [
          {
            type: 'grpc-request',
            name: 'Say Hello',
            seq: 1,
            request: {
              url: 'grpc://localhost:50051',
              method: '/helloworld.Greeter/SayHello',
              methodType: 'unary',
              body: { mode: 'grpc', grpc: [{ name: 'message 1', content: '{}' }] }
            }
          },
          {
            type: 'ws-request',
            name: 'Echo',
            seq: 2,
            request: {
              url: 'wss://echo.example.com',
              body: { mode: 'ws', ws: [{ name: 'message 1', content: '{}' }] }
            }
          }
        ]
      }));

      const grpcRequest = readRequest(`Say Hello.${format}`);
      const wsRequest = readRequest(`Echo.${format}`);

      expect(grpcRequest).toHaveProperty('type', 'grpc-request');
      expect(grpcRequest).toHaveProperty('request.url', 'grpc://localhost:50051');
      expect(grpcRequest).toHaveProperty('request.method', '/helloworld.Greeter/SayHello');
      expect(wsRequest).toHaveProperty('type', 'ws-request');
      expect(wsRequest).toHaveProperty('request.url', 'wss://echo.example.com');
    });

    it('writes a folder file and nested requests, carrying the folder seq', async () => {
      await write(collectionWith({
        items: [
          {
            type: 'folder',
            name: 'Users',
            seq: 3,
            root: { meta: { name: 'Users' } },
            items: [httpItem({ name: 'List Users', filename: `list-users.${format}` })]
          }
        ]
      }));

      const folder = parseFolder(read('Users', `folder.${format}`), { format });
      const nestedRequest = readRequest('Users', `list-users.${format}`);

      expect(folder).toHaveProperty('meta.name', 'Users');
      expect(folder).toHaveProperty('meta.seq', 3);
      expect(nestedRequest).toHaveProperty('type', 'http-request');
      expect(nestedRequest).toHaveProperty('request.method', 'GET');
    });

    it('skips the folder file when the folder has no root name', async () => {
      await write(collectionWith({
        items: [{ type: 'folder', name: 'Bare', items: [httpItem()] }]
      }));

      expect(fs.readdirSync(path.join(outputDir, 'Bare'))).toEqual([`Get Users.${format}`]);
    });

    it('writes request examples', async () => {
      await write(collectionWith({
        items: [
          httpItem({
            examples: [
              {
                uid: 'ex1',
                name: 'Success Response',
                type: 'http-request',
                request: {
                  url: 'https://api.example.com/users',
                  method: 'GET',
                  headers: [],
                  params: [],
                  body: { mode: 'none' }
                },
                response: {
                  status: 200,
                  statusText: 'OK',
                  headers: [{ uid: 'h1', name: 'Content-Type', value: 'application/json', enabled: true }],
                  body: {
                    type: 'json',
                    content: JSON.stringify([{ id: 1, name: 'John' }], null, 2)
                  }
                }
              }
            ]
          })
        ]
      }));

      const parsed = readRequest(`Get Users.${format}`);
      expect(parsed.examples).toHaveLength(1);
      expect(parsed.examples[0].name).toBe('Success Response');
      expect(Number(parsed.examples[0].response.status)).toBe(200);
      expect(parsed.examples[0].response.body.content).toContain('John');
    });

    it('writes request settings', async () => {
      await write(collectionWith({
        items: [
          httpItem({
            settings: { omitHeaders: ['X-Debug'], followRedirects: false, maxRedirects: 3 }
          })
        ]
      }));

      const { settings } = readRequest(`Get Users.${format}`);
      expect(settings.omitHeaders).toEqual(['X-Debug']);
      expect(settings.followRedirects).toBe(false);
      expect(settings.maxRedirects).toBe(3);
    });

    it('writes environments to environments/<name>', async () => {
      await write(collectionWith({
        environments: [
          {
            uid: 'env1',
            name: 'Dev',
            variables: [
              { uid: 'var1', name: 'host', value: 'https://dev.example.com', enabled: true, secret: false, type: 'text' }
            ]
          }
        ]
      }));

      const environment = parseEnvironment(read('environments', `Dev.${format}`), { format });
      expect(environment.variables).toEqual([
        expect.objectContaining({ name: 'host', value: 'https://dev.example.com', enabled: true })
      ]);
    });

    it('writes the collection root file even when the collection has no root', async () => {
      await write(collectionWith({ root: undefined }));

      const rootFile = format === 'bru' ? 'collection.bru' : 'opencollection.yml';
      expect(fs.existsSync(path.join(outputDir, rootFile))).toBe(true);
    });

    it('throws for unsupported item types', async () => {
      await expect(write(collectionWith({ items: [{ type: 'unsupported-type', name: 'Unsupported' }] })))
        .rejects.toThrow('Unsupported item type: unsupported-type');
    });

    it('creates an output directory that does not exist yet', async () => {
      outputDir = path.join(tempDir, 'nested', 'collection');

      await expect(write(collectionWith({}))).resolves.toBe(outputDir);
      expect(fs.existsSync(outputDir)).toBe(true);
    });

    it('accepts an existing empty output directory', async () => {
      fs.mkdirSync(outputDir);

      await write(collectionWith({ items: [httpItem()] }));

      expect(fs.existsSync(path.join(outputDir, `Get Users.${format}`))).toBe(true);
    });

    it('refuses a non-empty output directory without writing anything', async () => {
      fs.mkdirSync(outputDir);
      fs.writeFileSync(path.join(outputDir, 'existing.txt'), 'keep me');

      await expect(write(collectionWith({ items: [httpItem()] }))).rejects.toMatchObject({
        message: `Output directory is not empty: ${outputDir}`,
        code: 'ENOTEMPTY'
      });
      expect(fs.readdirSync(outputDir)).toEqual(['existing.txt']);
    });

    it('appends a missing extension to the request filename', async () => {
      await write(collectionWith({ items: [httpItem({ filename: 'get-users' })] }));

      expect(fs.existsSync(path.join(outputDir, `get-users.${format}`))).toBe(true);
    });

    it('sanitises illegal characters in request filenames', async () => {
      await write(collectionWith({ items: [httpItem({ filename: `users/list:all.${format}` })] }));

      expect(fs.existsSync(path.join(outputDir, `users-list-all.${format}`))).toBe(true);
    });
  });

  it('writes bruno.json alongside collection.bru in bru format', async () => {
    await writeCollectionToDiskLegacy(collectionWith({}), outputDir, { format: 'bru' });

    expect(JSON.parse(read('bruno.json'))).toEqual({
      version: '1',
      name: 'Imported Collection',
      type: 'collection',
      ignore: ['node_modules', '.git']
    });
  });

  it('embeds the opencollection version in opencollection.yml', async () => {
    await writeCollectionToDiskLegacy(collectionWith({}), outputDir, { format: 'yml' });

    expect(read('opencollection.yml')).toContain('opencollection: 1.0.0');
    expect(fs.existsSync(path.join(outputDir, 'bruno.json'))).toBe(false);
  });

  it('defaults to the yml format', async () => {
    await writeCollectionToDisk(collectionWith({}), outputDir);

    expect(fs.existsSync(path.join(outputDir, 'opencollection.yml'))).toBe(true);
  });
});
