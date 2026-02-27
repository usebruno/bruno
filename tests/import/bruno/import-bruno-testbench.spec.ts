import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('Import Bruno Testbench Collection', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Bruno Testbench collection successfully', async ({ page, createTmpDir }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-testbench.json');

    await importCollection(page, brunoFile, await createTmpDir('bruno-testbench-test'), {
      expectedCollectionName: 'bruno-testbench'
    });
  });
});
