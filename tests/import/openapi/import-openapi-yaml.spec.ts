import { test, expect } from '../../../playwright';
import * as path from 'path';
import { 
  startImportAndUploadFile, 
  waitForImportLoader, 
  waitForLocationModal, 
  verifyCollectionInLocationModal, 
  closeModals 
} from '../../utils/PageUtils/index';

test.describe('Import OpenAPI v3 YAML Collection', () => {
  test('Import comprehensive OpenAPI v3 YAML successfully', async ({ page }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-comprehensive.yaml');

    // start the import process and upload file
    await startImportAndUploadFile(page, openApiFile);

    // wait for the file processing to complete
    await waitForImportLoader(page);

    // verify that the collection location modal appears
    await waitForLocationModal(page);
    await verifyCollectionInLocationModal(page, 'Comprehensive API Test Collection');

    // cleanup: close any open modals
    await closeModals(page);
  });
});
