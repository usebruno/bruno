import { test, expect } from '../playwright';
test('should be able to switch between light and dark theme', async ({ page }) => {
  await page.getByLabel('Open Preferences').click();
  await page.getByRole('tab', { name: 'Display' }).click();
  await page.getByLabel('Light').check();
  const element_lightMode = page.locator('.bruno-modal-header');
  const bgColor_lightMode = await element_lightMode.evaluate((el) =>
    window.getComputedStyle(el).backgroundColor);
  expect(bgColor_lightMode).toBe('rgb(241, 241, 241)');
  await page.getByLabel('Dark').check();
  const element_darkMode = page.locator('.bruno-modal-header');
  const bgColor_darkMode = await element_darkMode.evaluate((el) =>
    window.getComputedStyle(el).backgroundColor
  );
  expect(bgColor_darkMode).toBe('rgb(38, 38, 39)');
  await page.getByLabel('System').check();
  for (const systemTheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: systemTheme });
    if (systemTheme === 'light') {
      const element_lightMode = page.locator('.bruno-modal-header');
      const bgColor = await element_lightMode.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor);
      expect(bgColor_lightMode).toBe('rgb(241, 241, 241)');
    } else if (systemTheme === 'dark') {
  const element_darkMode = page.locator('.bruno-modal-header');
  const bgColor_darkMode = await element_darkMode.evaluate((el) =>
    window.getComputedStyle(el).backgroundColor
  );
  expect(bgColor_darkMode).toBe('rgb(38, 38, 39)');
    }
    console.log(`Emulated system theme: ${systemTheme}`);
  }
});