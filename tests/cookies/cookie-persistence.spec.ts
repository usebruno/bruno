import path from 'path';
import { test, expect, closeElectronApp } from '../../playwright';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test('should persist cookies across app restarts', async ({ createTmpDir, launchElectronApp }) => {
  // Create a temporary user-data directory so we control where the cookies store file is written.
  const userDataPath = await createTmpDir('cookie-persistence');

  const app1 = await launchElectronApp({ userDataPath, initUserDataPath });
  const page1 = await app1.firstWindow();
  await page1.waitForSelector('[data-trigger="cookies"]');

  // Open Cookies modal via the status-bar button.
  await page1.click('[data-trigger="cookies"]');

  // When no cookies are present the modal shows a centred "Add Cookie" button.
  await page1.getByRole('button', { name: /Add Cookie/i }).click();

  // Fill out the form.
  await page1.fill('input[name="domain"]', 'example.com');
  await page1.fill('input[name="path"]', '/');
  await page1.fill('input[name="key"]', 'session');
  await page1.fill('input[name="value"]', 'abc123');
  await page1.check('input[name="secure"]');
  await page1.check('input[name="httpOnly"]');

  await page1.getByRole('button', { name: 'Save' }).click();

  await expect(page1.getByText('example.com')).toBeVisible();

  await closeElectronApp(app1);

  // Second launch – verify the cookie was persisted and re-loaded
  const app2 = await launchElectronApp({ userDataPath, initUserDataPath });
  const page2 = await app2.firstWindow();

  // Open the Cookies modal again.
  await page2.waitForSelector('[data-trigger="cookies"]');
  await page2.click('[data-trigger="cookies"]');

  // The domain we added earlier should still be present.
  await expect(page2.getByText('example.com')).toBeVisible();

  await closeElectronApp(app2);
});
