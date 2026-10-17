import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';

test('should add a cookie via the modal raw-edit mode', async ({ createTmpDir, launchElectronApp }) => {
  const userDataPath = await createTmpDir('cookie-raw-mode');

  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);

  await page.waitForSelector('[data-trigger="cookies"]');
  await page.click('[data-trigger="cookies"]');

  await page.getByRole('button', { name: /Add Cookie/i }).click();

  const modal = page.locator('.bruno-modal').filter({ hasText: 'Edit Raw' });
  await expect(modal).toBeVisible();

  const rawSwitch = modal.locator('.ml-auto').filter({ hasText: 'Edit Raw' });
  await rawSwitch.locator('label').first().click();

  const rawTextarea = modal.getByPlaceholder('key=value; key2=value2');
  await expect(rawTextarea).toBeVisible();

  await rawTextarea.fill('session=raw-abc; Domain=raw-example.com; Path=/; Secure; HttpOnly');

  await modal.getByRole('button', { name: 'Save' }).click();

  await expect(modal).toBeHidden();
  await expect(page.getByText('raw-example.com')).toBeVisible();

  await closeElectronApp(app);
});
