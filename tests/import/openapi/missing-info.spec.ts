import { test, expect } from '../../../playwright';
import * as path from 'path';
import { 
  startImportAndUploadFile, 
  waitForImportLoader, 
  closeModals 
} from '../../utils/PageUtils';

test.describe('Invalid OpenAPI - Missing Info Section', () => {
  test('Handle OpenAPI specification missing required info section', async ({ page }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-missing-info.yaml');

    // start the import process and upload file
    await startImportAndUploadFile(page, openApiFile);

    // wait for the file processing to complete
    await waitForImportLoader(page);

    // the OpenAPI parser might handle missing info gracefully with defaults
    const hasError = await page.getByText('Import collection failed').first().isVisible();

    // either should show an error or create an "Untitled Collection"
    expect(hasError).toBe(true);

    // cleanup: close any open modals
    await closeModals(page);
  });
});
