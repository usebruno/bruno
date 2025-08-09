import { test, expect } from '../../playwright';

test.describe.serial('Persistent Environment Test', () => {
  test.setTimeout(2 * 10 * 1000);

  test('add env using script', async ({ pageWithUserData: page, restartApp }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByText('ping2', { exact: true }).click();
    await page.getByText('Env', { exact: true }).click();
    await page.getByText('Stage', { exact: true }).click();
    await page.locator('#send-request').getByRole('img').nth(2).click();
    await page.waitForTimeout(1000);
    await page
      .locator('div')
      .filter({ hasText: /^Stage$/ })
      .nth(3)
      .click();
    await page.getByText('Configure', { exact: true }).click();
    await expect(page.getByRole('row', { name: 'persistent-env-test' }).getByRole('cell').nth(3)).toBeVisible();
    await page.getByText('×').click();

    const newApp = await restartApp();
    const newPage = await newApp.firstWindow();
    await newPage.locator('#sidebar-collection-name').click();
    await newPage.getByRole('button', { name: 'Save' }).click();
    await newPage.getByText('ping2', { exact: true }).click();
    await newPage.getByText('No Environment').click();
    await newPage.getByText('Stage').click();
    await newPage
      .locator('div')
      .filter({ hasText: /^Stage$/ })
      .nth(3)
      .click();
    await newPage.getByText('Configure', { exact: true }).click();
    await expect(newPage.getByRole('row', { name: 'persistent-env-test' }).getByRole('cell').nth(3)).not.toBeVisible();
    await newPage.getByText('×').click();
    await newPage.waitForTimeout(1000);
    await newPage.close();
  });
});
