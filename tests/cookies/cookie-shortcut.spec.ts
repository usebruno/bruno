import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';

test('Must open a Coookies Shortcut whenever we type a keyboard shortcut', async ({ createTmpDir, launchElectronApp }) => {
  // Creating a temp user data dir
  const userDataPath = await createTmpDir('cookie-shortcut');

  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);

  // The status Is Present with User Keyboard Is Pressing
  await page.waitForSelector('[data-trigger="cookies"]');
  await page.keyboard.press('Control+Shift+K');

  // Verifying Cookies Model Open With checkign a Add Cookie
  await expect(page.getByRole('button', { name: /Add Cookie/i })).toBeVisible();

  await closeElectronApp(app);
});
