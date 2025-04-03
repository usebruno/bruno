import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { importCollectionFromFilepath } from '../../src/insomnia/insomnia_to_bruno';

describe('insomnia-collection', () => {
  it('should correctly import a valid Insomnia collection file', async () => {
    // Path to the sample Insomnia file
    const fileName = path.resolve(__dirname, '../data', 'collections/sample_insomnia_collection.json');

    // Call the importCollection function with the sample file
    const brunoCollection = await importCollectionFromFilepath({ filepath: fileName });

    // Assert that the returned collection matches the expected structure
    expect(brunoCollection).toMatchSnapshot()
  });
});
