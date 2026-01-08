import { test, expect } from '../../../playwright';
import { sendRequest, openRequest, selectEnvironment, openEnvironmentSelector, closeEnvironmentPanel, closeAllCollections } from '../../utils/page';

test.describe.serial('bru.deleteEnvVar(name)', () => {
  test('should remove ephemeral variable from UI after deletion', async ({ pageWithUserData: page }) => {
    await test.step('Open request and select environment', async () => {
      await openRequest(page, 'collection', 'api-deleteEnvVar');
      await selectEnvironment(page, 'Stage');
    });

    await test.step('Send request to set and delete variable', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Verify variable is removed from UI', async () => {
      await openEnvironmentSelector(page, 'collection');
      await page.getByText('Configure', { exact: true }).click();

      const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
      await expect(envTab).toBeVisible();

      await expect(page.getByRole('row', { name: 'host' })).toBeVisible();
      await expect(page.getByRole('row', { name: 'tempToken' })).not.toBeVisible();
    });

    await test.step('Cleanup', async () => {
      await closeEnvironmentPanel(page, 'collection');
      await closeAllCollections(page);
    });
  });
});
