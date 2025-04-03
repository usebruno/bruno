import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { importCollectionFromFilepath } from '../../src/postman/postman_to_bruno';

describe('postman-collection', () => {
  it('should correctly import a valid Postman collection file', async () => {
    // Path to the sample Postman collection file
    const fileName = path.resolve(__dirname, '../data', 'collections/sample_postman_collection.json');

    // Call the importCollection function with the sample file
    const brunoCollection = await importCollectionFromFilepath({ filepath: fileName, options: {
      enablePostmanTranslations: {
        enabled: true,
        label: 'Auto translate postman scripts',
        subLabel:
          "When enabled, Bruno will try as best to translate the scripts from the imported collection to Bruno's format."
      }
    }});

    // console.log(brunoCollection);

    // Assert that the returned collection matches the expected structure
    expect(brunoCollection).toMatchSnapshot()
  });
});
