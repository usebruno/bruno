import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('Import Postman Collection v2.1', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Postman Collection v2.1 successfully', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-v21.json');

    await importCollection(page, postmanFile, await createTmpDir('postman-v21-test'), {
      expectedCollectionName: 'Postman v2.1 Collection'
    });
  });
});
