import { test } from '@e2e/test';
import * as path from 'path';
import { closeAllCollections, importCollection } from '@e2e/pages';

test.describe('Import Postman Collection v2.1 (wrapped format)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Postman Collection v2.1 with collection envelope successfully', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'test-data', 'postman-v21-wrapped.json');

    await importCollection(page, postmanFile, await createTmpDir('postman-v21-wrapped-test'), {
      expectedCollectionName: 'Postman v2.1 Wrapped Collection'
    });
  });
});
