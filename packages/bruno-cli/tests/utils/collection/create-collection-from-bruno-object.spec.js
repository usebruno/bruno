const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, expect, afterEach } = require('@jest/globals');
const { parseRequest, parseFolder } = require('@usebruno/filestore');
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
});
