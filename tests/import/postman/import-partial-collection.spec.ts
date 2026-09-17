import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, dismissImportIssuesToasts, importCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Postman Collection with partial import issues', () => {
  test.afterEach(async ({ page }) => {
    await dismissImportIssuesToasts(page);
    await closeAllCollections(page);
  });

  test('should import valid requests and show issues toast for skipped items', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-import-issues.json');
    const tmpDir = await createTmpDir('postman-partial-import');
    const locators = buildCommonLocators(page);

    await importCollection(page, postmanFile, tmpDir, {
      expectedCollectionName: 'Import Issues Test Collection',
      expectIssues: true
    });

    await test.step('Verify import issues toast content', async () => {
      const toastTitle = locators.import.issuesToastTitle();
      await expect(toastTitle).toBeVisible();
      await expect(toastTitle).toContainText('item(s) skipped');
    });

    await test.step('Verify toast action buttons are visible', async () => {
      await expect(locators.import.issuesToastCopyBtn()).toBeVisible();
      await expect(locators.import.issuesToastReportBtn()).toBeVisible();
    });

    await test.step('Verify include items checkbox is visible', async () => {
      await expect(locators.import.issuesToastIncludeItemsCheckbox()).toBeVisible();
    });

    await test.step('Verify valid top-level requests were imported', async () => {
      await expect(locators.sidebar.request('Valid GET Request')).toBeVisible();
      await expect(locators.sidebar.request('Valid POST Request')).toBeVisible();
      await expect(locators.sidebar.request('Valid PUT Request')).toBeVisible();
      await expect(locators.sidebar.request('Valid PATCH Request')).toBeVisible();
    });

    await test.step('Verify skipped requests are NOT in the sidebar', async () => {
      await expect(locators.sidebar.request('Missing Method (null)')).not.toBeVisible();
      await expect(locators.sidebar.request('Missing Method (absent)')).not.toBeVisible();
      await expect(locators.sidebar.request('Empty String Method')).not.toBeVisible();
      await expect(locators.sidebar.request('Whitespace-Only Method')).not.toBeVisible();
    });

    await test.step('Verify folder and nested valid requests were imported', async () => {
      const folder = locators.sidebar.folder('API Folder');
      await expect(folder).toBeVisible();
      await folder.click();

      await expect(locators.sidebar.request('Valid Nested GET')).toBeVisible();

      const subfolder = locators.sidebar.folder('Deep Subfolder');
      await expect(subfolder).toBeVisible();
      await subfolder.click();

      await expect(locators.sidebar.request('Deep Valid Request')).toBeVisible();
    });

    await test.step('Verify nested skipped requests are NOT in the sidebar', async () => {
      await expect(locators.sidebar.request('Nested Missing Method')).not.toBeVisible();
      await expect(locators.sidebar.request('Deep Bad Method')).not.toBeVisible();
    });
  });

  test('should allow copying import issues to clipboard', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-import-issues.json');
    const tmpDir = await createTmpDir('postman-partial-import-copy');
    const locators = buildCommonLocators(page);

    await importCollection(page, postmanFile, tmpDir, {
      expectedCollectionName: 'Import Issues Test Collection',
      expectIssues: true
    });

    await test.step('Click copy button and verify success toast', async () => {
      await locators.import.issuesToastCopyBtn().click();
      await expect(page.getByText('Copied to clipboard')).toBeVisible({ timeout: 3000 });
    });
  });

  test('should open GitHub issue with prefilled details when clicking Report on GitHub', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-import-issues.json');
    const tmpDir = await createTmpDir('postman-partial-import-report');
    const locators = buildCommonLocators(page);

    await importCollection(page, postmanFile, tmpDir, {
      expectedCollectionName: 'Import Issues Test Collection',
      expectIssues: true
    });

    await test.step('Mock window.open and click Report on GitHub', async () => {
      // Mock window.open to capture the URL instead of opening a browser
      await page.evaluate(() => {
        (window as any).__capturedOpenUrl = null;
        window.open = (url?: string | URL) => {
          (window as any).__capturedOpenUrl = url != null ? String(url) : '';
          return null;
        };
      });

      await locators.import.issuesToastReportBtn().click();

      const openedUrl = await page.evaluate(() => (window as any).__capturedOpenUrl as string);

      expect(openedUrl).toContain('https://github.com/usebruno/bruno/issues/new');
      expect(openedUrl).toContain('title=');
      expect(openedUrl).toContain('Postman+import');
      expect(openedUrl).toContain('labels=bug');
      expect(openedUrl).toContain('Missing+or+invalid+request+method');
    });
  });
});
