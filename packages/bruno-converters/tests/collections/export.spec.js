// export.spec.js

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import exportCollection from '../../src/collections/export';
import { parseFile, readFile } from '../../src/common/file';
import fs from 'fs';
import path from 'path';

describe('exportCollection Function', () => {
  let tempDir;
  const outputDir = path.resolve(__dirname, '../data/output');
  const outputFilePath = outputDir + '/export.json';

  // Ensure the output directory exists
  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
  });

  afterAll(async () => {
    // Clean up: remove the temporary directory and its contents
    try {
      if (fs.existsSync(outputFilePath)) {
        await fs.unlinkSync(outputFilePath);
      }

    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  });

  it('should export the collection with UIDs removed and secrets cleared', async () => {
    // Sample collection object
    const sampleCollection = {
      uid: 'collection-uid',
      name: 'Sample Collection',
      version: '1',
      processEnvVariables: { envVar1: 'value1' }, // Should be deleted
      items: [
        {
          uid: 'item-uid-1',
          name: 'Sample Request',
          type: 'http-request',
          request: {
            url: 'https://api.example.com/data',
            method: 'GET',
            headers: [
              { uid: 'header-uid-1', name: 'Authorization', value: 'Bearer token' }
            ],
            params: [{ uid: 'param-uid-1', name: 'query', value: 'test' }],
            body: {
              mode: 'none',
              formUrlEncoded: [{ uid: 'body-param-uid-1', name: 'field', value: 'value' }],
              multipartForm: []
            }
          }
        }
      ],
      environments: [
        {
          uid: 'env-uid-1',
          name: 'Development',
          variables: [
            { uid: 'var-uid-1', name: 'apiKey', value: 'secretKey', secret: true },
            { uid: 'var-uid-2', name: 'timeout', value: '30', secret: false }
          ]
        }
      ]
    };

    // Call exportCollection with the sample collection and output file path
    await exportCollection(sampleCollection, outputFilePath);

    // Read the exported file
    const exportedCollection = await parseFile(outputFilePath);

    // Expected collection after export
    const expectedCollection = {
      name: 'Sample Collection',
      version: '1',
      items: [
        {
          name: 'Sample Request',
          type: 'http',
          request: {
            url: 'https://api.example.com/data',
            method: 'GET',
            headers: [
              { name: 'Authorization', value: 'Bearer token' }
            ],
            query: [{ name: 'query', value: 'test' }],
            body: {
              mode: 'none',
              formUrlEncoded: [{ name: 'field', value: 'value' }],
              multipartForm: []
            }
          }
        }
      ],
      environments: [
        {
          name: 'Development',
          variables: [
            { name: 'apiKey', value: '', secret: true }, // Secret value cleared
            { name: 'timeout', value: '30', secret: false }
          ]
        }
      ]
    };

    // Assert that the exported collection matches the expected collection
    expect(exportedCollection).toEqual(expectedCollection);
  });
});
