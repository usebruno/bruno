import { test, expect } from '../../../playwright';

test.describe('Multiline Variables - Write Test', () => {
  test('should create and use multiline environment variable dynamically', async ({ pageWithUserData: page }) => {
    test.setTimeout(60 * 1000);

    // open the collection
    await expect(page.getByTitle('multiline-variables')).toBeVisible();
    await page.getByTitle('multiline-variables').click();

    // open request
    await expect(page.getByTitle('multiline-test', { exact: true })).toBeVisible();
    await page.getByTitle('multiline-test', { exact: true }).click();

    // open environment dropdown
    await page.locator('div.current-environment').click();


    // select test environment
    await expect(page.locator('.dropdown-item').filter({ hasText: 'Test' })).toBeVisible();
    await page.locator('.dropdown-item').filter({ hasText: 'Test' }).click();
    await expect(page.locator('.current-environment').filter({ hasText: /Test/ })).toBeVisible();

    // select configure button from environment dropdown
    // open environment dropdown again
    await page.locator('div.current-environment').click();

    // open environment configuration
    await expect(page.getByText('Configure', { exact: true })).toBeVisible();
    await page.getByText('Configure', { exact: true }).click();

    // add variable
    await page.getByRole('button', { name: /Add.*Variable/i }).click();
    const valueTextarea = page.locator('.bruno-modal-card textarea').last();
    await expect(valueTextarea).toBeVisible();

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

    // fill variable value
    await valueTextarea.fill(jsonValue);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.type('multiline_data_json');

    // save variable and close config
    const saveVarButton = page.getByRole('button', { name: /Save/i });
    await expect(saveVarButton).toBeVisible();
    await saveVarButton.click();

    await expect(page.locator('.close.cursor-pointer')).toBeVisible();
    await page.locator('.close.cursor-pointer').click();

    // send request
    const sendButton = page.locator('#send-request').getByRole('img').nth(2);
    await expect(sendButton).toBeVisible();
    await sendButton.click();

    // wait for response status
    await expect(page.locator('.response-status-code.text-ok')).toBeVisible();
    await expect(page.locator('.response-status-code')).toContainText('200');

    // verify multiline JSON variable resolution in response
    const expectedBody =
      '{\n  "user": {\n    "name": "John Doe",\n    "email": "john@example.com",\n    "preferences": {\n      "theme": "dark",\n      "notifications": true\n    }\n  },\n  "metadata": {\n    "created": "2025-09-03",\n    "version": "1.0"\n  }\n}';
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
