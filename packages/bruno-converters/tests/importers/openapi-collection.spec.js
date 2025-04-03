import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { importOpenAPICollection } from '../../src';

describe('openapi-collection', () => {
  it('should correctly import a valid OpenAPI file', async () => {
    // Path to the sample OpenAPI file
    const fileName = path.resolve(__dirname, '../data', 'sample_openapi.yaml');

    // Call the importCollection function with the sample file
    const brunoCollection = await importOpenAPICollection(fileName);

    // Assert that the returned collection matches the expected structure
    expect(brunoCollection).toMatchSnapshot()
  });
});
