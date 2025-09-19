import { test, expect } from '../../../playwright';
import * as path from 'path';
import { 
  startImportAndUploadFile, 
  waitForImportLoader, 
  closeModals 
} from '../../utils/PageUtils';

test.describe('Invalid OpenAPI - Malformed YAML', () => {
  test('Handle malformed OpenAPI YAML structure', async ({ page }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-malformed.yaml');

    // start the import process and upload file
    await startImportAndUploadFile(page, openApiFile);

    // wait for the file processing to complete
    await waitForImportLoader(page);

    // check for error message - this should fail during YAML parsing
    const hasParseError = await page.getByText('Failed to parse the file').isVisible();
    const hasImportError = await page.getByText('Import collection failed').isVisible();

    // either parsing error or import error should be shown
    expect(hasParseError || hasImportError).toBe(true);

    // cleanup: close any open modals
    await closeModals(page);
  });
});
