import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { importInsomniaCollection } from '../../src';

describe('insomnia-collection', () => {
  it('should correctly import a valid Insomnia collection file', async () => {
    // Path to the sample Insomnia file
    const fileName = path.resolve(__dirname, '../data', 'sample_insomnia_export.json');

    // Call the importCollection function with the sample file
    const brunoCollection = await importInsomniaCollection(fileName);

    // Assert that the returned collection matches the expected structure
    expect(brunoCollection).toMatchSnapshot()
  });
});
