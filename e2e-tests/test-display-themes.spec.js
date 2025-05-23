import { test, expect } from '../playwright';
test('Verify Display Themes', async ({ page }) => {
  await page.getByLabel('Open Preferences').click();
  await page.getByRole('tab', { name: 'Display' }).click();
  await page.getByLabel('Light').check();
  await expect(page.getByText("Light")).toHaveCSS("color", "rgb(52, 52, 52)");
  await page.getByLabel('Dark').check();
  await expect(page.getByText("Dark")).toHaveCSS("color", "rgb(204, 204, 204)");
  await page.getByLabel('System').check();
  for (const systemTheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: systemTheme });
    if (systemTheme === 'light') {
      await expect(page.getByText("Light")).toHaveCSS("color", "rgb(52, 52, 52)");
    }else if (systemTheme === 'dark') {
      await expect(page.getByText("Dark")).toHaveCSS("color", "rgb(204, 204, 204)");
    }
    console.log(`Emulated system theme: ${systemTheme}`);
  }
});