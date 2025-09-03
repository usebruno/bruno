import { test, expect } from '../../playwright';

test.describe.serial('Persistent Environment Test', () => {
  test.setTimeout(2 * 10 * 1000);

  test('add env with mixed persistence', async ({ pageWithUserData: page, restartApp }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByText('non-persist-2', { exact: true }).click();
    await page.getByText('Stage', { exact: true }).click();
    await page.getByText('Prod', { exact: true }).click();
    await page.locator('#send-request').getByRole('img').nth(2).click();
    await page.waitForTimeout(1000);
    await page
      .locator('div')
      .filter({ hasText: /^Prod$/ })
      .nth(3)
      .click();
    await page.getByText('Configure', { exact: true }).click();
    await expect(page.getByRole('row', { name: 'non-persist-env-key-2' }).getByRole('cell').nth(3)).toBeVisible();
    await expect(page.getByRole('row', { name: 'persist-env-key' }).getByRole('cell').nth(3)).toBeVisible();
    await page.getByText('×').click();

    const newApp = await restartApp();
    const newPage = await newApp.firstWindow();
    await newPage.locator('#sidebar-collection-name').click();
    await newPage.getByRole('button', { name: 'Save' }).click();
    await newPage.getByText('non-persist-2', { exact: true }).click();
    await newPage.getByText('No Environment').click();
    await newPage.getByText('Prod').click();
    await newPage
      .locator('div')
      .filter({ hasText: /^Prod$/ })
      .nth(3)
      .click();
    await newPage.getByText('Configure', { exact: true }).click();
    await expect(newPage.getByRole('row', { name: 'non-persist-env-key-2' }).getByRole('cell').nth(3)).not.toBeVisible();
    await expect(
      newPage.getByRole('row', { name: 'persist-env-key' }).getByRole('cell').nth(3)
    ).toBeVisible();
    await newPage.getByText('×').click();
    await newPage.waitForTimeout(1000);
    await newPage.close();
  });
});
