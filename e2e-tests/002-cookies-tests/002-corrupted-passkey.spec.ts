import { test, expect } from '../../playwright';
import * as path from 'path';
import * as fs from 'fs/promises';

test('should handle corrupted passkey and still display saved cookie list', async ({ createTmpDir, launchElectronApp }) => {
  test.setTimeout(2 * 60 * 1000);
  const userDataPath = await createTmpDir('corrupted-passkey');

  const app1 = await launchElectronApp({ userDataPath });
  // 1. First run – add a cookie via the UI so `cookies.json` is created.
  const page1 = await app1.firstWindow();

  await page1.waitForSelector('[data-trigger="cookies"]');
  await page1.click('[data-trigger="cookies"]');
  await page1.getByRole('button', { name: /Add Cookie/i }).click();

  await page1.fill('input[name="domain"]', 'example.com');
  await page1.fill('input[name="path"]', '/');
  await page1.fill('input[name="key"]', 'session');
  await page1.fill('input[name="value"]', 'abc123');
  await page1.check('input[name="secure"]');
  await page1.check('input[name="httpOnly"]');

  await page1.getByRole('button', { name: 'Save' }).click();

  await expect(page1.getByText('example.com')).toBeVisible();
  await page1.waitForTimeout(500);
  await app1.close();

  // 2. Corrupt the encryptedPasskey in cookies.json
  const cookiesFilePath = path.join(userDataPath, 'cookies.json');
  const raw = await fs.readFile(cookiesFilePath, 'utf-8');
  const cookiesJson = JSON.parse(raw);
  cookiesJson.encryptedPasskey = 'deadbeef'; // clearly invalid value
  await fs.writeFile(cookiesFilePath, JSON.stringify(cookiesJson, null, 2));

  // 3. Second run – Bruno should recover and still list the cookie domain
  const app2 = await launchElectronApp({ userDataPath });
  const page2 = await app2.firstWindow();

  await page2.waitForSelector('[data-trigger="cookies"]');
  await page2.click('[data-trigger="cookies"]');

  // The domain row should still be visible (even if cookie values are blank).
  await expect(page2.getByText('example.com')).toBeVisible();

  await page2.waitForTimeout(3000);


  await app2.close();
});
