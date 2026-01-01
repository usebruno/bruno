import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('Import Postman Collection v2.0', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Postman Collection v2.0 successfully', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-v20.json');

    await importCollection(page, postmanFile, await createTmpDir('postman-v20-test'), {
      expectedCollectionName: 'Postman v2.0 Collection'
    });
  });
});
