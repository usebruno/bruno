import { test, expect } from '../../../playwright';
import fs from 'fs';
import path from 'path';
import { sendRequest } from '../../utils/page';

test.describe.serial('bru.setEnvVar(name, value, { persist: true })', () => {
  test('set env var with persist using script', async ({ pageWithUserData: page, restartApp }) => {
    // Keep a copy of the original Stage.bru file
    const originalStageBruPath = path.join(__dirname, 'fixtures/collection/environments/Stage.bru');
    const originalStageBruContent = fs.readFileSync(originalStageBruPath, 'utf8');

    // Select the collection and request
    await page.locator('#sidebar-collection-name').click();
    await page.getByText('api-setEnvVar-with-persist', { exact: true }).click();

    // open environment dropdown
    await page.getByTestId('environment-selector-trigger').click();

    // select stage environment
    await expect(page.locator('.environment-list .dropdown-item', { hasText: 'Stage' })).toBeVisible();
    await page.locator('.environment-list .dropdown-item', { hasText: 'Stage' }).click();
    await expect(page.locator('.current-environment', { hasText: 'Stage' })).toBeVisible();

    // Send the request
    await sendRequest(page, 200);

    // confirm that the environment variable is set
    await page.getByTestId('environment-selector-trigger').hover();
    await page.getByTestId('environment-selector-trigger').click();
    // open environment configuration

    await page.locator('#configure-env').hover();
    await page.locator('#configure-env').click();

    const envTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Environments' }) });
    await expect(envTab).toBeVisible();

    await expect(page.getByRole('row', { name: 'token' }).getByRole('cell').nth(1)).toBeVisible();
    await expect(page.getByRole('row', { name: 'secret' }).getByRole('cell').nth(2)).toBeVisible();
    await envTab.hover();
    await envTab.getByTestId('request-tab-close-icon').click();

    // we restart the app to confirm that the environment variable is persisted
    const newApp = await restartApp();
    const newPage = await newApp.firstWindow();

    // select the collection and request
    await newPage.locator('#sidebar-collection-name').click();
    await newPage.getByText('api-setEnvVar-with-persist', { exact: true }).click();

    // open environment dropdown
    await newPage.getByTestId('environment-selector-trigger').click();
    await newPage.locator('#configure-env').click();

    const newEnvTab = newPage.locator('.request-tab').filter({ hasText: 'Environments' });
    await expect(newEnvTab).toBeVisible();

    await expect(newPage.getByRole('row', { name: 'token' }).getByRole('cell').nth(1)).toBeVisible();
    await expect(newPage.getByRole('row', { name: 'secret' }).getByRole('cell').nth(2)).toBeVisible();

    await newEnvTab.hover();
    await newEnvTab.getByTestId('request-tab-close-icon').click();

    // Restore the original Stage.bru file
    fs.writeFileSync(originalStageBruPath, originalStageBruContent);
    await newPage.close();
  });
});
