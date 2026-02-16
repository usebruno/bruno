import { test, expect } from '../../../playwright';
import { sendRequest } from '../../utils/page';

test.describe.serial('bru.setEnvVar(name, value)', () => {
  test('set env var using script', async ({ pageWithUserData: page, restartApp }) => {
    // Select the collection and request
    await page.locator('#sidebar-collection-name').click();
    await page.getByText('api-setEnvVar-without-persist', { exact: true }).click();

    // open environment dropdown
    await page.getByTestId('environment-selector-trigger').click();

    // select stage environment
    await expect(page.locator('.environment-list .dropdown-item', { hasText: 'Stage' })).toBeVisible();
    await page.locator('.environment-list .dropdown-item', { hasText: 'Stage' }).click();
    await expect(page.locator('.current-environment', { hasText: 'Stage' })).toBeVisible();

    // Send the request
    await sendRequest(page, 200);

    // confirm that the environment variable is set
    await page.getByTestId('environment-selector-trigger').click();
    await page.locator('#configure-env').click();

    const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
    await expect(envTab).toBeVisible();

    await expect(page.getByRole('row', { name: 'token' }).getByRole('cell').nth(1)).toBeVisible();
    await expect(page.getByRole('row', { name: 'secret' }).getByRole('cell').nth(2)).toBeVisible();
    await envTab.hover();
    await envTab.getByTestId('request-tab-close-icon').click({ force: true });

    // we restart the app to confirm that the environment variable is not persisted
    const newApp = await restartApp();
    const newPage = await newApp.firstWindow();

    // select the collection and request
    await newPage.locator('#sidebar-collection-name').click();
    await newPage.getByText('api-setEnvVar-without-persist', { exact: true }).click();

    // open environment dropdown
    await newPage.getByTestId('environment-selector-trigger').click();
    await newPage.locator('#configure-env').click();

    const newEnvTab = newPage.locator('.request-tab').filter({ hasText: 'Environments' });
    await expect(newEnvTab).toBeVisible();

    await expect(newPage.locator('.table-container tbody')).not.toContainText('token');

    await newEnvTab.hover();
    await newEnvTab.getByTestId('request-tab-close-icon').click({ force: true });
    await newPage.close();
  });
});
