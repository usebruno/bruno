import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, dismissImportIssuesToasts, importCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Postman Collection with many issues (URL too long warning)', () => {
  test.afterEach(async ({ page }) => {
    await dismissImportIssuesToasts(page);
    await closeAllCollections(page);
  });

  test('should show URL-too-long warning when include failed request data is checked', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-many-import-issues.json');
    const tmpDir = await createTmpDir('postman-many-issues');
    const locators = buildCommonLocators(page);

    await importCollection(page, postmanFile, tmpDir, {
      expectedCollectionName: 'Many Import Issues Collection',
      expectIssues: true
    });

    await test.step('Verify toast title and action buttons are visible', async () => {
      await expect(locators.import.issuesToastTitle()).toBeVisible();
      await expect(locators.import.issuesToastTitle()).toContainText('item(s) skipped');
      await expect(locators.import.issuesToastCopyBtn()).toBeVisible();
      await expect(locators.import.issuesToastReportBtn()).toBeVisible();
    });

    await test.step('Check include failed request data checkbox', async () => {
      const checkbox = locators.import.issuesToastIncludeItemsCheckbox();
      await expect(checkbox).toBeVisible();
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    });

    await test.step('Verify URL-too-long warning appears after checking include items', async () => {
      const warning = locators.import.issuesToastUrlTooLongWarning();
      await expect(warning).toBeVisible();
      await expect(warning).toContainText('clipboard');
    });

    await test.step('Verify valid requests were imported', async () => {
      await expect(locators.sidebar.request('Valid GET Request')).toBeVisible();
      await expect(locators.sidebar.request('Valid POST Request')).toBeVisible();
      await expect(locators.sidebar.request('Valid PUT Request')).toBeVisible();
    });

    await test.step('Report on GitHub copies to clipboard and opens URL without body', async () => {
      await page.evaluate(() => {
        (window as any).__capturedOpenUrl = null;
        window.open = (url?: string | URL) => {
          (window as any).__capturedOpenUrl = url != null ? String(url) : '';
          return null;
        };
      });

      await locators.import.issuesToastReportBtn().click();

      // Should show clipboard success toast
      await expect(page.getByText('Issue details copied')).toBeVisible({ timeout: 3000 });

      // URL should have title but NOT body (since it was too long)
      const openedUrl = await page.evaluate(() => (window as any).__capturedOpenUrl as string);
      expect(openedUrl).toContain('https://github.com/usebruno/bruno/issues/new');
      expect(openedUrl).toContain('title=');
      expect(openedUrl).toContain('labels=bug');
      expect(openedUrl).not.toContain('Missing+or+invalid+request+method');
    });
  });
});
