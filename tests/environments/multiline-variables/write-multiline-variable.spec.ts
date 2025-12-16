import { test, expect } from '../../../playwright';

test.describe('Multiline Variables - Write Test', () => {
  test('should create and use multiline environment variable dynamically', async ({ pageWithUserData: page }) => {
    test.setTimeout(60 * 1000);

    // open the collection
    const collection = page.getByTestId('collections').locator('#sidebar-collection-name').filter({ hasText: 'multiline-variables' });
    await expect(collection).toBeVisible();
    await collection.click();

    // open request
    await expect(page.getByTitle('multiline-test', { exact: true })).toBeVisible();
    await page.getByTitle('multiline-test', { exact: true }).dblclick();

    // open environment dropdown
    await page.locator('div.current-environment').click();

    // select test environment
    await expect(page.locator('.dropdown-item').filter({ hasText: 'Test' })).toBeVisible();
    await page.locator('.dropdown-item').filter({ hasText: 'Test' }).click();
    await expect(page.locator('.current-environment').filter({ hasText: /Test/ })).toBeVisible();

    // select configure button from environment dropdown
    await page.locator('div.current-environment').click();

    // open environment configuration
    await expect(page.getByText('Configure', { exact: true })).toBeVisible();
    await page.getByText('Configure', { exact: true }).click();

    const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
    await expect(envTab).toBeVisible();

    const emptyRowNameInput = page.locator('tbody tr').last().locator('input[placeholder="Name"]');
    await expect(emptyRowNameInput).toBeVisible();
    await emptyRowNameInput.fill('multiline_data_json');

    const jsonValue = `{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  },
  "metadata": {
    "created": "2025-09-03",
    "version": "1.0"
  }
}`;

    const variableRow = page.locator('tbody tr').filter({ has: page.locator('input[value="multiline_data_json"]') });
    const codeMirror = variableRow.locator('.CodeMirror');
    await codeMirror.click();
    await page.keyboard.insertText(jsonValue);

    await page.getByTestId('save-env').click();

    await envTab.hover();
    await envTab.getByTestId('request-tab-close-icon').click();

    await page.getByTestId('send-arrow-icon').click();

    // wait for response status
    await expect(page.locator('.response-status-code.text-ok')).toBeVisible();
    await expect(page.locator('.response-status-code')).toContainText('200');

    // verify multiline JSON variable resolution in response
    const expectedBody
      = '{\n  "user": {\n    "name": "John Doe",\n    "email": "john@example.com",\n    "preferences": {\n      "theme": "dark",\n      "notifications": true\n    }\n  },\n  "metadata": {\n    "created": "2025-09-03",\n    "version": "1.0"\n  }\n}';
    await expect(page.locator('.response-pane')).toContainText(`"body": ${JSON.stringify(expectedBody)}`);
  });

  // clean up created variable after test
  test.afterEach(async () => {
    const fs = require('fs');
    const path = require('path');

    const testBruPath = path.join(__dirname, 'collection/environments/Test.bru');
    let content = fs.readFileSync(testBruPath, 'utf8');

    // remove the multiline_data_json variable and its content
    content = content.replace(/\s*multiline_data_json:\s*'''\s*[\s\S]*?\s*'''/g, '');

    fs.writeFileSync(testBruPath, content);
  });
});
