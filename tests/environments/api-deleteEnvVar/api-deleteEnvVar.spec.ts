import { test, expect } from '../../../playwright';
import { sendRequest, openRequest, selectEnvironment, openEnvironmentSelector, closeEnvironmentPanel, closeAllCollections } from '../../utils/page';

test.describe.serial('bru.deleteEnvVar(name)', () => {
  test('should remove ephemeral variable from UI after deletion', async ({ pageWithUserData: page }) => {
    await openRequest(page, 'collection', 'api-deleteEnvVar');

    await selectEnvironment(page, 'Stage');

    await sendRequest(page, 200);

    await openEnvironmentSelector(page, 'collection');
    await page.getByText('Configure', { exact: true }).click();

    const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
    await expect(envTab).toBeVisible();

    await expect(page.locator('.table-container tbody')).toContainText('host');
    await expect(page.locator('.table-container tbody')).not.toContainText('tempToken');

    await closeEnvironmentPanel(page, 'collection');

    await closeAllCollections(page);
  });
});
