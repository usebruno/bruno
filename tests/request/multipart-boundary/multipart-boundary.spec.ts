import { test, expect } from '../../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  closeAllCollections,
  selectRequestPaneTab,
  sendRequest
} from '../../utils/page';
import { buildCommonLocators, getTableCell } from '../../utils/page/locators';

const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

/**
 * E2E test for multipart/mixed boundary preservation
 * Regression test for: https://github.com/usebruno/bruno/issues/7523
 *
 * When a user specifies a boundary parameter in their Content-Type header
 * for multipart/mixed requests with TEXT body mode, Bruno should preserve
 * the user-defined boundary instead of generating a new one.
 */
test.describe.serial('Multipart boundary preservation', () => {
  const collectionName = 'multipart-boundary-test';
  const requestName = 'Boundary Test';
  const testServerUrl = 'http://localhost:8081/headers';
  const customBoundary = 'my-custom-boundary-12345';

  test.beforeAll(async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('multipart-boundary-collection');
    await createCollection(page, collectionName, collectionPath);
    await createRequest(page, requestName, collectionName, {
      url: testServerUrl,
      method: 'GET'
    });
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should preserve user-defined boundary in multipart/mixed Content-Type header', async ({ page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open request and configure headers', async () => {
      await openRequest(page, collectionName, requestName);

      // Go to Headers tab and add Content-Type header with custom boundary
      await selectRequestPaneTab(page, 'Headers');

      // Find the first row in headers table (empty row for adding new headers)
      const headerRow = page.locator('table tbody tr').first();
      await headerRow.waitFor({ state: 'visible' });

      // Get the name cell (first column after checkbox) and enter header name
      const nameCell = getTableCell(headerRow, 0);
      await nameCell.locator('.CodeMirror').click();
      await nameCell.locator('textarea').fill('Content-Type');

      // Get the value cell (second column) and enter header value with custom boundary
      const valueCell = getTableCell(headerRow, 1);
      await valueCell.locator('.CodeMirror').click();
      await valueCell.locator('textarea').fill(`multipart/mixed; boundary=${customBoundary}`);
    });

    await test.step('Set body to TEXT mode with multipart content', async () => {
      await selectRequestPaneTab(page, 'Body');

      // Select Text body mode
      await locators.request.bodyModeSelector().click();
      await locators.dropdown.item('Text').click();

      // Enter multipart body content using the custom boundary
      const bodyCodeMirror = locators.request.bodyEditor().locator('.CodeMirror');
      await bodyCodeMirror.click();
      await page.keyboard.press(selectAllShortcut);

      const multipartBody = `--${customBoundary}\r
Content-Disposition: form-data; name="field1"\r
\r
value1\r
--${customBoundary}--`;

      await page.keyboard.type(multipartBody);
    });

    await test.step('Send request and verify boundary is preserved', async () => {
      // Use longer timeout for external service (httpbin.org)
      await sendRequest(page, 200, 30000);

      // httpbin.org/post returns request headers in the response JSON
      // We need to verify the Content-Type header contains our custom boundary
      // and NOT a duplicate auto-generated boundary
      const responseBody = locators.response.previewContainer();

      // Verify the response contains our custom boundary
      await expect(responseBody).toContainText(customBoundary, { timeout: 10000 });

      // Verify there's only one boundary parameter (not duplicated)
      // The response should show: "Content-Type": "multipart/mixed; boundary=my-custom-boundary-12345"
      const responseText = await responseBody.innerText();

      // Count occurrences of "boundary=" - should be exactly 1 (not duplicated)
      const boundaryMatches = responseText.match(/boundary=/gi);
      expect(boundaryMatches).not.toBeNull();
      expect(boundaryMatches?.length).toBe(1);
    });
  });

  test('should auto-generate boundary when none is specified in Content-Type header', async ({ page }) => {
    const locators = buildCommonLocators(page);
    const requestNameNoBoundary = 'No Boundary Test';

    await test.step('Create a new request without boundary', async () => {
      await createRequest(page, requestNameNoBoundary, collectionName, {
        url: testServerUrl,
        method: 'GET'
      });
    });

    await test.step('Open request and configure headers without boundary', async () => {
      await openRequest(page, collectionName, requestNameNoBoundary);

      // Go to Headers tab and add Content-Type header WITHOUT boundary
      await selectRequestPaneTab(page, 'Headers');

      const headerRow = page.locator('table tbody tr').first();
      await headerRow.waitFor({ state: 'visible' });

      const nameCell = getTableCell(headerRow, 0);
      await nameCell.locator('.CodeMirror').click();
      await nameCell.locator('textarea').fill('Content-Type');

      // Set Content-Type to multipart/mixed WITHOUT specifying a boundary
      const valueCell = getTableCell(headerRow, 1);
      await valueCell.locator('.CodeMirror').click();
      await valueCell.locator('textarea').fill('multipart/mixed');
    });

    await test.step('Set body to Multipart Form mode and add a field', async () => {
      await selectRequestPaneTab(page, 'Body');

      // Select Multipart Form body mode so Bruno has data to create FormData from
      await locators.request.bodyModeSelector().click();
      await locators.dropdown.item('Multipart Form').click();

      // Wait for the body editor to switch to multipart form mode
      await page.waitForTimeout(500);

      // The multipart form has an editable table - find and fill the first row
      // The name column has placeholder "Key" (defined in MultipartFormParams columns)
      const nameInput = page.locator('[data-testid="editable-table"] input[placeholder="Key"]').first();
      await nameInput.waitFor({ state: 'visible', timeout: 5000 });
      await nameInput.click();
      await nameInput.fill('testField');

      // Tab to value and fill it
      await page.keyboard.press('Tab');
      await page.keyboard.type('testValue');
    });

    await test.step('Send request and verify boundary was auto-generated', async () => {
      await sendRequest(page, 200, 30000);

      const responseBody = locators.response.previewContainer();
      const responseText = await responseBody.innerText();

      // Verify that a boundary parameter exists (was auto-generated)
      const boundaryMatches = responseText.match(/boundary=/gi);
      expect(boundaryMatches).not.toBeNull();
      expect(boundaryMatches?.length).toBe(1);

      // Verify the Content-Type contains multipart/mixed with a boundary
      await expect(responseBody).toContainText('multipart/mixed', { timeout: 5000 });
      await expect(responseBody).toContainText('boundary=', { timeout: 5000 });
    });
  });
});
