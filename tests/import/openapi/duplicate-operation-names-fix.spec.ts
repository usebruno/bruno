import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  startImportAndUploadFile,
  waitForImportLoader,
  waitForLocationModal,
  verifyCollectionInLocationModal,
  completeImport,
  verifyCollectionImported,
  configureCollectionSettings,
  getRequestCount,
  closeCollection,
  returnToHomePage
} from '../../utils/PageUtils';

test.describe('OpenAPI Duplicate Names Handling', () => {
  test('should handle duplicate operation names', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-duplicate-operation-name.yaml');

    // start the import process and upload file
    await startImportAndUploadFile(page, openApiFile);

    // wait for the file processing to complete
    await waitForImportLoader(page);

    // verify that the collection location modal appears (OpenAPI files go directly to location modal)
    await waitForLocationModal(page);
    // verify the collection name is correctly parsed despite duplicate operation names
    await verifyCollectionInLocationModal(page, 'Duplicate Test Collection');

    // select a location and complete import
    await completeImport(page, await createTmpDir('duplicate-test'));

    // verify the collection was imported successfully
    await verifyCollectionImported(page, 'Duplicate Test Collection');

    // configure the collection settings
    await configureCollectionSettings(page, 'Duplicate Test Collection');

    // wait for the collection to be fully loaded
    await page.waitForTimeout(1000);

    // verify that all requests were imported correctly despite duplicate operation names
    const requestCount = await getRequestCount(page, 'duplicate-test-collection');
    expect(requestCount).toBe(3);

    // cleanup: close the collection
    await closeCollection(page, 'Duplicate Test Collection');

    // return to home page
    await returnToHomePage(page);
  });
});
