import { test, expect } from '../playwright';

test('Verify Display Themes', async ({ page }) => {

  await page.getByLabel('Open Preferences').click();

  // Verify themes under display tab
  await page.getByRole('tab', { name: 'Display' }).click();
  await page.getByLabel('Light').check();
  await expect(page.getByText("Light")).toHaveCSS("color", "rgb(52, 52, 52)");
  console.log('Verified Light theme');

  await page.getByLabel('Dark').check();
  await expect(page.getByText("Dark")).toHaveCSS("color", "rgb(204, 204, 204)");
  console.log('Verified Dark theme');

  await page.getByLabel('System').check();
  // ------------theme verification against system------------ //
  for (const systemTheme of ['light', 'dark']) {
    // Emulate system color scheme
    await page.emulateMedia({ colorScheme: systemTheme });
    if (systemTheme === 'light') {
      await expect(page.getByText("Light")).toHaveCSS("color", "rgb(52, 52, 52)");
    }else if (systemTheme === 'dark') {
      await expect(page.getByText("Dark")).toHaveCSS("color", "rgb(204, 204, 204)");
    }
    console.log(`Emulated system theme: ${systemTheme}`);
  }

});