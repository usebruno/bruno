import { test } from '@e2e/test';
import * as path from 'path';
import { closeAllCollections, importCollection } from '@e2e/pages';

test.describe('Import Insomnia Collection v4', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Insomnia Collection v4 successfully', async ({ page, createTmpDir }) => {
    const insomniaFile = path.resolve(__dirname, 'test-data', 'insomnia-v4.json');

    await importCollection(page, insomniaFile, await createTmpDir('insomnia-v4-test'), {
      expectedCollectionName: 'Test API Collection v4'
    });
  });
});
