import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { importPostmanCollection } from '../../src';

describe('postman-collection', () => {
  it('should correctly import a valid Postman collection file', async () => {
    // Path to the sample Postman collection file
    const fileName = path.resolve(__dirname, '../data', 'sample_postman_collection.json');

    // Call the importCollection function with the sample file
    const brunoCollection = await importPostmanCollection(fileName);

    // Assert that the returned collection matches the expected structure
    expect(brunoCollection).toMatchSnapshot()
  });
});
