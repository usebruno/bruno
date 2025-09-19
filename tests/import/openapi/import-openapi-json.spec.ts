import { test, expect } from '../../../playwright';
import * as path from 'path';
import { 
  startImportAndUploadFile, 
  waitForImportLoader, 
  waitForLocationModal, 
  verifyCollectionInLocationModal, 
  closeModals 
} from '../../utils/PageUtils';

test.describe('Import OpenAPI v3 JSON Collection', () => {
  test('Import simple OpenAPI v3 JSON successfully', async ({ page }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-simple.json');

    // start the import process and upload file
    await startImportAndUploadFile(page, openApiFile);

    // wait for the file processing to complete
    await waitForImportLoader(page);

    // verify that the collection location modal appears
    await waitForLocationModal(page);
    await verifyCollectionInLocationModal(page, 'Simple Test API');

    // cleanup: close any open modals
    await closeModals(page);
  });
});
