import { test, expect } from '../../../playwright';

test.describe('Preferences Tab Switch Persistence', () => {
  test('should persist General tab SSL setting when immediately switching tabs', async ({ page }) => {
    await page.locator('.preferences-button').click();
    const generalTab = page.getByRole('tab', { name: 'General' });
    await expect(generalTab).toBeVisible();
    await generalTab.click();
    await expect(page.locator('#general-panel')).toBeVisible();

    const sslCheckbox = page.locator('#sslVerification');
    await expect(sslCheckbox).toBeVisible();
    const initialChecked = await sslCheckbox.isChecked();

    await sslCheckbox.click();

    const themesTab = page.getByRole('tab', { name: 'Themes' });
    await themesTab.click();
    await expect(page.locator('#themes-panel')).toBeVisible();

    await generalTab.click();
    await expect(page.locator('#general-panel')).toBeVisible();
    await expect(sslCheckbox).toBeChecked({ checked: !initialChecked });

    await sslCheckbox.click();
    await expect(sslCheckbox).toBeChecked({ checked: initialChecked });
  });

  test('should persist Store Cookies setting when immediately switching tabs', async ({ page }) => {
    await page.locator('.preferences-button').click();
    const generalTab = page.getByRole('tab', { name: 'General' });
    await expect(generalTab).toBeVisible();
    await generalTab.click();
    await expect(page.locator('#general-panel')).toBeVisible();

    const storeCookiesCheckbox = page.locator('#storeCookies');
    await expect(storeCookiesCheckbox).toBeVisible();
    const initialChecked = await storeCookiesCheckbox.isChecked();

    await storeCookiesCheckbox.click();

    const themesTab = page.getByRole('tab', { name: 'Themes' });
    await themesTab.click();
    await expect(page.locator('#themes-panel')).toBeVisible();

    await generalTab.click();
    await expect(storeCookiesCheckbox).toBeChecked({ checked: !initialChecked });

    await storeCookiesCheckbox.click();
    await expect(storeCookiesCheckbox).toBeChecked({ checked: initialChecked });
  });

  test('should persist Cache settings when immediately switching tabs', async ({ page }) => {
    await page.locator('.preferences-button').click();
    const cacheTab = page.getByRole('tab', { name: 'Cache' });
    await expect(cacheTab).toBeVisible();
    await cacheTab.click();
    await expect(page.locator('#cache-panel')).toBeVisible();

    const sslSessionCheckbox = page.locator('#sslSession\\.enabled');
    await expect(sslSessionCheckbox).toBeVisible();
    const initialChecked = await sslSessionCheckbox.isChecked();

    await sslSessionCheckbox.click();

    const themesTab = page.getByRole('tab', { name: 'Themes' });
    await themesTab.click();
    await expect(page.locator('#themes-panel')).toBeVisible();

    await cacheTab.click();
    await expect(page.locator('#cache-panel')).toBeVisible();
    await expect(sslSessionCheckbox).toBeChecked({ checked: !initialChecked });

    await sslSessionCheckbox.click();
    await expect(sslSessionCheckbox).toBeChecked({ checked: initialChecked });
  });

  test('should persist settings after closing and reopening preferences tab', async ({ page }) => {
    await page.locator('.preferences-button').click();
    const generalTab = page.getByRole('tab', { name: 'General' });
    await expect(generalTab).toBeVisible();
    await generalTab.click();
    await expect(page.locator('#general-panel')).toBeVisible();

    const sslCheckbox = page.locator('#sslVerification');
    await expect(sslCheckbox).toBeVisible();
    const initialChecked = await sslCheckbox.isChecked();

    await sslCheckbox.click();

    const preferencesTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
    await preferencesTab.hover();
    await preferencesTab.locator('.close-icon').click({ force: true });
    await expect(preferencesTab).toBeHidden();

    await page.locator('.preferences-button').click();
    await expect(preferencesTab).toBeVisible();
    await expect(generalTab).toBeVisible();
    await generalTab.click();
    await expect(page.locator('#general-panel')).toBeVisible();
    await expect(sslCheckbox).toBeChecked({ checked: !initialChecked });

    await sslCheckbox.click();
    await expect(sslCheckbox).toBeChecked({ checked: initialChecked });
  });

  test('should persist Cache settings after closing and reopening preferences', async ({ page }) => {
    await page.locator('.preferences-button').click();
    const cacheTab = page.getByRole('tab', { name: 'Cache' });
    await expect(cacheTab).toBeVisible();
    await cacheTab.click();
    await expect(page.locator('#cache-panel')).toBeVisible();

    const sslSessionCheckbox = page.locator('#sslSession\\.enabled');
    await expect(sslSessionCheckbox).toBeVisible();
    const initialCacheState = await sslSessionCheckbox.isChecked();

    await sslSessionCheckbox.click();

    const preferencesTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
    await preferencesTab.hover();
    await preferencesTab.locator('.close-icon').click({ force: true });
    await expect(preferencesTab).toBeHidden();

    await page.locator('.preferences-button').click();
    await expect(preferencesTab).toBeVisible();
    await expect(cacheTab).toBeVisible();
    await cacheTab.click();
    await expect(page.locator('#cache-panel')).toBeVisible();
    await expect(sslSessionCheckbox).toBeChecked({ checked: !initialCacheState });

    await sslSessionCheckbox.click();
    await expect(sslSessionCheckbox).toBeChecked({ checked: initialCacheState });
  });
});
