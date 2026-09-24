import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('Import Postman Collection v2.1 (wrapped format)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Postman Collection v2.1 with collection envelope successfully', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-v21-wrapped.json');

    await importCollection(page, postmanFile, await createTmpDir('postman-v21-wrapped-test'), {
      expectedCollectionName: 'Postman v2.1 Wrapped Collection'
    });
  });
});
