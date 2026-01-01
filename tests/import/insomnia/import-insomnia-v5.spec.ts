import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('Import Insomnia Collection v5', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Insomnia Collection v5 successfully', async ({ page, createTmpDir }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-v5.yaml');

    await importCollection(page, insomniaFile, await createTmpDir('insomnia-v5-test'), {
      expectedCollectionName: 'Test API Collection v5'
    });
  });
});
