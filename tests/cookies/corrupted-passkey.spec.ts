import { test, expect, closeElectronApp } from '../../playwright';
import * as path from 'path';
import * as fs from 'fs/promises';
import { waitForReadyPage } from '../utils/page';

test('should handle corrupted passkey and still display saved cookie list', async ({ createTmpDir, launchElectronApp }) => {
  test.setTimeout(120000);

  const userDataPath = await createTmpDir('corrupted-passkey');
  const cookiesFilePath = path.join(userDataPath, 'cookies.json');

  const app1 = await launchElectronApp({ userDataPath });
  // 1. First run – add a cookie via the UI so `cookies.json` is created.
  const page1 = await waitForReadyPage(app1);

  await page1.waitForSelector('[data-trigger="cookies"]');
  await page1.click('[data-trigger="cookies"]');
  const cookiesModal1 = page1.locator('.bruno-modal').filter({ hasText: 'Cookies' });
  await expect(cookiesModal1).toBeVisible();

  await page1.getByRole('button', { name: /Add Cookie/i }).click();

  await page1.fill('input[name="domain"]', 'example.com');
  await page1.fill('input[name="path"]', '/');
  await page1.fill('input[name="key"]', 'session');
  await page1.fill('input[name="value"]', 'abc123');
  await page1.check('input[name="secure"]');
  await page1.check('input[name="httpOnly"]');

  await page1.getByRole('button', { name: 'Save' }).click();

  await expect(cookiesModal1.getByText('example.com')).toBeVisible({ timeout: 15000 });

  // Persist must succeed before we can corrupt the passkey — otherwise relaunch
  // has nothing to recover. (chown ENOENT on temp userdata surfaces here.)
  await expect
    .poll(async () => {
      try {
        const raw = await fs.readFile(cookiesFilePath, 'utf-8');
        return raw.includes('example.com');
      } catch {
        return false;
      }
    }, { timeout: 15000 })
    .toBe(true);

  await closeElectronApp(app1);

  // 2. Corrupt the encryptedPasskey in cookies.json
  const raw = await fs.readFile(cookiesFilePath, 'utf-8');
  const cookiesJson = JSON.parse(raw);
  cookiesJson.encryptedPasskey = 'deadbeef'; // clearly invalid value
  await fs.writeFile(cookiesFilePath, JSON.stringify(cookiesJson, null, 2));

  // 3. Second run – Bruno should recover and still list the cookie domain
  const app2 = await launchElectronApp({ userDataPath });
  const page2 = await waitForReadyPage(app2);

  await page2.waitForSelector('[data-trigger="cookies"]');
  await page2.click('[data-trigger="cookies"]');

  const cookiesModal2 = page2.locator('.bruno-modal').filter({ hasText: 'Cookies' });
  await expect(cookiesModal2).toBeVisible();
  // The domain row should still be visible (even if cookie values are blank).
  await expect(cookiesModal2.getByText('example.com')).toBeVisible({ timeout: 15000 });

  await closeElectronApp(app2);
});
