/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { importCollectionFromFilePath } from '../../src/openapi/openapi_to_bruno';

describe('openapi-collection', () => {
  it('should correctly import a valid OpenAPI file', async () => {
    // Path to the sample OpenAPI file
    const fileName = path.resolve(__dirname, '../data', 'collections/sample_openapi_collection.yaml');

    // Call the importCollection function with the sample file
    const brunoCollection = await importCollectionFromFilePath({ filepath: fileName });

    // Assert that the returned collection matches the expected structure
    expect(brunoCollection).toMatchSnapshot()
  });
});
