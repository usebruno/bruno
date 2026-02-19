const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, expect, afterEach } = require('@jest/globals');
const { parseRequest, parseFolder } = require('@usebruno/filestore');
const { createCollectionFromBrunoObject } = require('../../../src/utils/collection');

describe('createCollectionFromBrunoObject', () => {
  let outputDir;

  afterEach(() => {
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('writes http and graphql requests from imported collection items', async () => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-import-'));

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
      outputDir
    );

    const httpPath = path.join(outputDir, 'get-users.bru');
    const graphqlPath = path.join(outputDir, 'get-viewer.bru');

    expect(fs.existsSync(httpPath)).toBe(true);
    expect(fs.existsSync(graphqlPath)).toBe(true);

    const httpRequest = parseRequest(fs.readFileSync(httpPath, 'utf8'), { format: 'bru' });
    const graphqlRequest = parseRequest(fs.readFileSync(graphqlPath, 'utf8'), { format: 'bru' });

    expect(httpRequest).toHaveProperty('type', 'http-request');
    expect(httpRequest).toHaveProperty('request.method', 'GET');
    expect(graphqlRequest).toHaveProperty('type', 'graphql-request');
    expect(graphqlRequest).toHaveProperty('request.method', 'POST');
  });

  it('writes folder.bru in BRU format for folder items', async () => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-import-'));

    await createCollectionFromBrunoObject(
      {
        name: 'folder-collection',
        items: [
          {
            type: 'folder',
            name: 'Users',
            seq: 3,
            root: {
              meta: {
                name: 'Users'
              }
            },
            items: []
          }
        ]
      },
      outputDir
    );

    const folderBruPath = path.join(outputDir, 'Users', 'folder.bru');
    expect(fs.existsSync(folderBruPath)).toBe(true);

    const folderRoot = parseFolder(fs.readFileSync(folderBruPath, 'utf8'), { format: 'bru' });
    expect(folderRoot).toHaveProperty('meta.name', 'Users');
    expect(folderRoot).toHaveProperty('meta.seq', 3);
  });

  it('throws for unsupported item types', async () => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-import-'));

    await expect(
      createCollectionFromBrunoObject(
        {
          name: 'invalid-type-collection',
          items: [
            {
              type: 'htttttppp',
              name: 'Invalid Request',
              filename: 'invalid-request.bru',
              request: {
                method: 'GET',
                url: 'https://api.example.com'
              }
            }
          ]
        },
        outputDir
      )
    ).rejects.toThrow('Unsupported item type: htttttppp');
  });
});
