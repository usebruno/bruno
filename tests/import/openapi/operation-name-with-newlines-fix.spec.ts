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
} from '../../utils/PageUtils/index';

test.describe('OpenAPI Newline Handling', () => {
  test('should handle operation names with newlines', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-newline-in-operation-name.yaml');

    // start the import process and upload file
    await startImportAndUploadFile(page, openApiFile);

    // wait for the file processing to complete
    await waitForImportLoader(page);

    // verify that the collection location modal appears (OpenAPI files go directly to location modal)
    await waitForLocationModal(page);
    await verifyCollectionInLocationModal(page, 'Newline Test Collection');

    // select a location and complete import
    await completeImport(page, await createTmpDir('newline-test'));

    // verify the collection was imported successfully
    await verifyCollectionImported(page, 'Newline Test Collection');

    // configure the collection settings
    await configureCollectionSettings(page, 'Newline Test Collection');

    // verify that all requests were imported correctly despite newlines in operation names
    // the parser should clean up the operation names and create valid request names
    const requestCount = await getRequestCount(page, 'newline-test-collection');
    expect(requestCount).toBe(2);

    // cleanup: close the collection
    await closeCollection(page, 'Newline Test Collection');

    // return to home page
    await returnToHomePage(page);
  });
});
