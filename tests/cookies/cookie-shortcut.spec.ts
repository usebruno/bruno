import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';

test('Must open a Coookies Shortcut whenever we type a keyboard shortcut', async ({ createTmpDir, launchElectronApp }) => {
  const userDataPath = await createTmpDir('cookie-shortcut');

  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);

  await page.waitForSelector('[data-trigger="cookies"]');
  await page.keyboard.press('ControlOrMeta+Shift+K');

  await expect(page.getByRole('button', { name: /Add Cookie/i })).toBeVisible();

  await closeElectronApp(app);
});
