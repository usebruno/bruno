import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('Import Insomnia Collection v4', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Insomnia Collection v4 successfully', async ({ page, createTmpDir }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-v4.json');

    await importCollection(page, insomniaFile, await createTmpDir('insomnia-v4-test'), {
      expectedCollectionName: 'Test API Collection v4'
    });
  });
});
