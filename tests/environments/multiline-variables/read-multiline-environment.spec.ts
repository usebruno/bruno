import { test, expect } from '../../../playwright';

test.describe('Multiline Variables - Read Environment Test', () => {
  test('should read existing multiline environment variables', async ({ pageWithUserData: page }) => {
    test.setTimeout(30 * 1000);

    // open the collection
    await expect(page.getByTitle('multiline-variables')).toBeVisible();
    await page.getByTitle('multiline-variables').click();

    // open request
    await expect(page.getByTitle('request', { exact: true })).toBeVisible();
    await page.getByTitle('request', { exact: true }).click();

    // open environment dropdown
    await page.locator('div.current-environment').click();

    // select test environment
    await expect(page.locator('.dropdown-item').filter({ hasText: 'Test' })).toBeVisible();
    await page.locator('.dropdown-item').filter({ hasText: 'Test' }).click();
    await expect(page.locator('.current-environment').filter({ hasText: /Test/ })).toBeVisible();

    // send request
    const sendButton = page.locator('#send-request').getByRole('img').nth(2);
    await expect(sendButton).toBeVisible();
    await sendButton.click();
    await expect(page.locator('.response-status-code.text-ok')).toBeVisible();
    await expect(page.locator('.response-status-code')).toContainText('200');

    // response pane should contain the expected multiline text in JSON body
    const responsePane = page.locator('.response-pane');
    await expect(responsePane).toContainText('"body": "https://www.httpfaker.org\\nline1\\nline2\\nline3"');
  });
});
