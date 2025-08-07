import { test, expect } from '../../playwright';
import { _electron as electron } from 'playwright';
import * as path from 'path';


test('should persist cookies across app restarts', async ({ createTmpDir }) => {
  // Resolve the path to the Electron application we want to launch.
  const electronAppPath = path.join(__dirname, '../../packages/bruno-electron');

  // Create a temporary (but deterministic for this test) user-data directory so
  // we control where the cookies store file is written.
  const userDataPath = await createTmpDir('cookie-persistence');

  const launchApp = () =>
    electron.launch({
      args: [electronAppPath],
      env: {
        ...process.env,
        ELECTRON_USER_DATA_PATH: userDataPath
      }
    });


  const app1 = await launchApp();
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

  await page1.getByRole('button', { name: 'Save' }).click();

  await expect(page1.getByText('example.com')).toBeVisible();

  await page1.waitForTimeout(500);

  await app1.close();

  // Second launch – verify the cookie was persisted and re-loaded
  const app2 = await launchApp();
  const page2 = await app2.firstWindow();

  // Open the Cookies modal again.
  await page2.waitForSelector('[data-trigger="cookies"]');
  await page2.click('[data-trigger="cookies"]');

  // The domain we added earlier should still be present.
  await expect(page2.getByText('example.com')).toBeVisible();

  // Allow some time for manual observation / renderer stabilization.
  await page2.waitForTimeout(3000);

  await app2.close();
});
