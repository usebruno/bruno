const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, expect, afterEach } = require('@jest/globals');
const { parseRequest, parseFolder, parseCollection, parseEnvironment } = require('@usebruno/filestore');
const { createCollectionFromBrunoObject } = require('../../../src/utils/collection');

describe('createCollectionFromBrunoObject', () => {
  let outputDir;
  const createOutputDir = () => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-import-'));
    return outputDir;
  };
  const parseBruRequestFromPath = (filePath) => parseRequest(fs.readFileSync(filePath, 'utf8'), { format: 'bru' });
  const parseBruFolderFromPath = (filePath) => parseFolder(fs.readFileSync(filePath, 'utf8'), { format: 'bru' });

  afterEach(() => {
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('writes http and graphql requests from imported collection items', async () => {
    createOutputDir();

    await createCollectionFromBrunoObject(
      {
        name: 'imported-collection',
        items: [
          {
            type: 'http-request',
            name: 'Get Users',
            filename: 'get-users.bru',
            seq: 1,
            request: {
              method: 'GET',
              url: 'https://api.example.com/users'
            }
          },
          {
            type: 'graphql-request',
            name: 'Get Viewer',
            filename: 'get-viewer.bru',
            seq: 2,
            request: {
              method: 'POST',
              url: 'https://api.example.com/graphql',
              body: {
                mode: 'graphql',
                graphql: {
                  query: 'query { viewer { id } }',
                  variables: '{}'
                }
              }
            }
          }
        ]
      },
      outputDir,
      { format: 'bru' }
    );

    const httpPath = path.join(outputDir, 'get-users.bru');
    const graphqlPath = path.join(outputDir, 'get-viewer.bru');

    expect(fs.existsSync(httpPath)).toBe(true);
    expect(fs.existsSync(graphqlPath)).toBe(true);

    const httpRequest = parseBruRequestFromPath(httpPath);
    const graphqlRequest = parseBruRequestFromPath(graphqlPath);

    expect(httpRequest).toHaveProperty('type', 'http-request');
    expect(httpRequest).toHaveProperty('request.method', 'GET');
    expect(graphqlRequest).toHaveProperty('type', 'graphql-request');
    expect(graphqlRequest).toHaveProperty('request.method', 'POST');
  });

  it('writes folder.bru in bru format', async () => {
    createOutputDir();

    await createCollectionFromBrunoObject(
      {
        name: 'folder-collection',
        items: [
          {
            type: 'folder',
            name: 'Users',
            seq: 3,
            root: {
              meta: { name: 'Users' }
            },
            items: [
              {
                type: 'http-request',
                name: 'List Users',
                filename: 'list-users.bru',
                seq: 1,
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/users'
                }
              }
            ]
          }
        ]
      },
      outputDir,
      { format: 'bru' }
    );

    const folderPath = path.join(outputDir, 'Users');
    const folderBruPath = path.join(folderPath, 'folder.bru');
    const nestedRequestPath = path.join(folderPath, 'list-users.bru');

    expect(fs.existsSync(folderBruPath)).toBe(true);
    expect(fs.existsSync(nestedRequestPath)).toBe(true);

    const folder = parseBruFolderFromPath(folderBruPath);
    const nestedRequest = parseBruRequestFromPath(nestedRequestPath);

    expect(folder).toHaveProperty('meta.name', 'Users');
    expect(folder).toHaveProperty('meta.seq', 3);
    expect(nestedRequest).toHaveProperty('type', 'http-request');
    expect(nestedRequest).toHaveProperty('request.method', 'GET');
  });

  it('writes examples from imported collection items', async () => {
    createOutputDir();

    await createCollectionFromBrunoObject(
      {
        name: 'examples-collection',
        items: [
          {
            type: 'http-request',
            name: 'Get Users',
            filename: 'get-users.bru',
            seq: 1,
            request: {
              method: 'GET',
              url: 'https://api.example.com/users'
            },
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
          }
        ]
      },
      outputDir,
      { format: 'bru' }
    );

    const httpPath = path.join(outputDir, 'get-users.bru');
    expect(fs.existsSync(httpPath)).toBe(true);

    const parsed = parseBruRequestFromPath(httpPath);
    expect(parsed.examples).toBeDefined();
    expect(parsed.examples).toHaveLength(1);
    expect(parsed.examples[0].name).toBe('Success Response');
    expect(Number(parsed.examples[0].response.status)).toBe(200);
    expect(parsed.examples[0].response.body.content).toContain('John');
  });

  it('throws for unsupported item types', async () => {
    createOutputDir();

    await expect(
      createCollectionFromBrunoObject(
        {
          name: 'invalid-item-type-collection',
          items: [
            {
              type: 'unsupported-type',
              name: 'Unsupported'
            }
          ]
        },
        outputDir,
        { format: 'bru' }
      )
    ).rejects.toThrow('Unsupported item type: unsupported-type');
  });

  // `.yaml` is an alternate extension for the same OpenCollection YAML content, so both layouts
  // must produce identical bytes under different filenames — anything that diverges is a bug.
  describe.each([
    { format: 'yml', ext: '.yml', collectionFile: 'opencollection.yml', folderFile: 'folder.yml' },
    { format: 'yaml', ext: '.yaml', collectionFile: 'opencollection.yaml', folderFile: 'folder.yaml' }
  ])('$format layout', ({ format, ext, collectionFile, folderFile }) => {
    const seed = (dirPath) =>
      createCollectionFromBrunoObject(
        {
          name: 'opencollection-collection',
          root: { request: { headers: [{ name: 'X-Collection-Header', value: 'v', enabled: true }] } },
          environments: [{ name: 'Development', variables: [{ name: 'baseUrl', value: 'https://api.dev', enabled: true }] }],
          items: [
            {
              type: 'folder',
              name: 'Users',
              seq: 3,
              root: { meta: { name: 'Users' } },
              items: [
                {
                  type: 'http-request',
                  name: 'List Users',
                  seq: 1,
                  request: { method: 'GET', url: 'https://api.example.com/users' }
                }
              ]
            },
            {
              type: 'http-request',
              name: 'Get Users',
              filename: `get-users${ext}`,
              seq: 1,
              request: { method: 'GET', url: 'https://api.example.com/users' }
            }
          ]
        },
        dirPath,
        { format }
      );

    it(`writes the collection root as ${collectionFile} and no bruno.json`, async () => {
      createOutputDir();
      await seed(outputDir);

      const rootPath = path.join(outputDir, collectionFile);
      expect(fs.existsSync(rootPath)).toBe(true);
      // bruno.json is a bru-format artifact; the opencollection config lives inside the root file.
      expect(fs.existsSync(path.join(outputDir, 'bruno.json'))).toBe(false);

      const parsed = parseCollection(fs.readFileSync(rootPath, 'utf8'), { format: 'yml' });
      expect(parsed).toHaveProperty('brunoConfig.opencollection', '1.0.0');
      expect(parsed).toHaveProperty('brunoConfig.name', 'opencollection-collection');
      expect(parsed).toHaveProperty('collectionRoot.request.headers[0].name', 'X-Collection-Header');
    });

    it(`writes request files with the ${ext} extension`, async () => {
      createOutputDir();
      await seed(outputDir);

      // Explicit filename already carries the extension; the name-derived one gets it appended.
      const explicitPath = path.join(outputDir, `get-users${ext}`);
      const derivedPath = path.join(outputDir, 'Users', `List Users${ext}`);

      expect(fs.existsSync(explicitPath)).toBe(true);
      expect(fs.existsSync(derivedPath)).toBe(true);

      const request = parseRequest(fs.readFileSync(explicitPath, 'utf8'), { format: 'yml' });
      expect(request).toHaveProperty('type', 'http-request');
      expect(request).toHaveProperty('request.method', 'GET');
      expect(request).toHaveProperty('request.url', 'https://api.example.com/users');
    });

    it(`writes the folder root as ${folderFile}`, async () => {
      createOutputDir();
      await seed(outputDir);

      const folderRootPath = path.join(outputDir, 'Users', folderFile);
      expect(fs.existsSync(folderRootPath)).toBe(true);

      const folder = parseFolder(fs.readFileSync(folderRootPath, 'utf8'), { format: 'yml' });
      expect(folder).toHaveProperty('meta.name', 'Users');
      expect(folder).toHaveProperty('meta.seq', 3);
    });

    it(`writes environment files with the ${ext} extension`, async () => {
      createOutputDir();
      await seed(outputDir);

      const envPath = path.join(outputDir, 'environments', `Development${ext}`);
      expect(fs.existsSync(envPath)).toBe(true);

      const env = parseEnvironment(fs.readFileSync(envPath, 'utf8'), { format: 'yml' });
      expect(env).toHaveProperty('name', 'Development');
      expect(env).toHaveProperty('variables[0].name', 'baseUrl');
      expect(env).toHaveProperty('variables[0].value', 'https://api.dev');
    });
  });

  it('writes byte-identical content for the yml and yaml layouts', async () => {
    const collection = () => ({
      name: 'parity-collection',
      root: { request: { headers: [{ name: 'X-Header', value: 'v', enabled: true }] } },
      items: [
        {
          type: 'folder',
          name: 'Users',
          seq: 1,
          root: { meta: { name: 'Users' } },
          items: [
            { type: 'http-request', name: 'List Users', seq: 1, request: { method: 'GET', url: 'https://api.example.com/users' } }
          ]
        }
      ]
    });

    const ymlDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-import-yml-'));
    const yamlDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-import-yaml-'));

    try {
      await createCollectionFromBrunoObject(collection(), ymlDir, { format: 'yml' });
      await createCollectionFromBrunoObject(collection(), yamlDir, { format: 'yaml' });

      const read = (dir, file) => fs.readFileSync(path.join(dir, file), 'utf8');

      expect(read(yamlDir, 'opencollection.yaml')).toBe(read(ymlDir, 'opencollection.yml'));
      expect(read(yamlDir, path.join('Users', 'folder.yaml'))).toBe(read(ymlDir, path.join('Users', 'folder.yml')));
      expect(read(yamlDir, path.join('Users', 'List Users.yaml'))).toBe(
        read(ymlDir, path.join('Users', 'List Users.yml'))
      );
    } finally {
      fs.rmSync(ymlDir, { recursive: true, force: true });
      fs.rmSync(yamlDir, { recursive: true, force: true });
    }
  });
});
