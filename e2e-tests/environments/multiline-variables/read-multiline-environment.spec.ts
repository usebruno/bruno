import { test, expect } from '../../../playwright';

test.describe('Multiline Variables - Read Environment Test', () => {
  test('should read existing multiline environment variables', async ({ pageWithUserData: page }) => {
    test.setTimeout(30 * 1000);

    // open the collection
    await expect(page.getByTitle('multiline-variables')).toBeVisible();
    await page.getByTitle('multiline-variables').click();

    // open request
    await expect(page.getByText('request', { exact: true })).toBeVisible();
    await page.getByText('request', { exact: true }).click();

    // open environment dropdown
    await expect(page.getByText('No Environment')).toBeVisible();
    await page.getByText('No Environment').click();

    // select test environment
    await expect(page.locator('.dropdown-item').filter({ hasText: 'Test' })).toBeVisible();
    await page.locator('.dropdown-item').filter({ hasText: 'Test' }).click();
    await expect(page.locator('.current-environment').filter({ hasText: /Test/ })).toBeVisible();

    // send request
    const sendButton = page.locator('#send-request').getByRole('img').nth(2);
    await expect(sendButton).toBeVisible();
    await sendButton.click();
    await expect(page.getByText('200')).toBeVisible();

    // response pane should contain the expected multiline text
    const responsePane = page.locator('div.response-pane CodeMirror');
    await expect(responsePane).toContainText('https://www.httpfaker.org\nline1\nline2\nline3');
  });
});