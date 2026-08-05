import { test, expect, Page } from '../../../playwright';
import * as path from 'path';
import {
  closeAllCollections,
  dismissImportIssuesToasts,
  expandFolder,
  importCollection,
  selectRequestPaneTab
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { DEFAULT_MAX_REDIRECTS } from '@usebruno/common/utils';
import { captureClipboardWrites } from '../../utils/clipboard';

const COLLECTION_NAME = 'Max Redirects Collection';

// Requests whose maxRedirects cannot be honoured: each produces one warning and falls back to the default.
const OFFENDERS = ['Null Limit', 'Negative Limit', 'Quoted Limit', 'Boolean Limit'];

const importFixture = async (page: Page, tmpDir: string) => {
  const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-max-redirects.json');
  await importCollection(page, postmanFile, tmpDir, {
    expectedCollectionName: COLLECTION_NAME,
    expectIssues: true
  });
};

const expectMaxRedirects = async (page: Page, requestName: string, expected: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.request(requestName).click();
  await selectRequestPaneTab(page, 'Settings');
  await expect(locators.requestSettings.maxRedirectsInput()).toHaveValue(expected);
};

test.describe('Import Postman Collection with maxRedirects', () => {
  test.afterEach(async ({ page }) => {
    await dismissImportIssuesToasts(page);
    await closeAllCollections(page);
  });

  test('should preserve usable maxRedirects values, however large', async ({
    page,
    createTmpDir
  }) => {
    await importFixture(page, await createTmpDir('postman-max-redirects-happy'));

    await test.step('a limit of 1000 survives the import', async () => {
      await expectMaxRedirects(page, 'Large Limit', '1000');
    });

    await test.step('an exponent-magnitude limit survives the write to disk and the read back', async () => {
      await expectMaxRedirects(page, 'Exponent Limit', '1e+31');
    });

    await test.step('an ordinary limit is untouched', async () => {
      await expectMaxRedirects(page, 'Ordinary Limit', '7');
    });

    await test.step('a limit of 50 is preserved', async () => {
      await expectMaxRedirects(page, 'Fifty Limit', '50');
    });

    await test.step('zero is preserved rather than treated as absent', async () => {
      await expectMaxRedirects(page, 'No Redirects', '0');
    });

    await test.step('a request with no protocolProfileBehavior shows the default', async () => {
      await expectMaxRedirects(page, 'Unset Limit', String(DEFAULT_MAX_REDIRECTS));
    });

    await test.step('a fractional limit is truncated to a whole number', async () => {
      await expectMaxRedirects(page, 'Fractional Limit', '3');
    });

    await test.step('a nested request keeps its own limit', async () => {
      await expandFolder(page, 'Reporting');
      await expectMaxRedirects(page, 'Nested Large Limit', '75');
    });
  });

  test('should import the whole collection and warn when a maxRedirects cannot be honoured', async ({
    page,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    await importFixture(page, await createTmpDir('postman-max-redirects-sad'));

    await test.step('every request is imported, offenders included', async () => {
      for (const name of [
        'Ordinary Limit',
        'Large Limit',
        'Exponent Limit',
        'Fifty Limit',
        'No Redirects',
        'Unset Limit',
        'Null Limit',
        'Negative Limit',
        'Quoted Limit',
        'Fractional Limit',
        'Boolean Limit'
      ]) {
        await expect(locators.sidebar.request(name)).toBeVisible();
      }

      await expandFolder(page, 'Reporting');
      await expect(locators.sidebar.request('Nested Large Limit')).toBeVisible();
    });

    await test.step('the toast reports the warning count', async () => {
      const toastTitle = locators.import.issuesToastTitle();
      await expect(toastTitle).toBeVisible();
      await expect(toastTitle).toContainText(`${OFFENDERS.length} warning(s)`);
    });

    await test.step('every offending request gets its own maxRedirects warning', async () => {
      const readCopiedText = await captureClipboardWrites(page);
      await locators.import.issuesToastCopyBtn().click();
      await expect(page.getByText('Copied to clipboard')).toBeVisible({ timeout: 3000 });

      const issuesSummary = (await readCopiedText()) ?? '';
      for (const requestName of OFFENDERS) {
        expect(issuesSummary).toContain(`[WARNING] ${requestName}`);
      }
      expect(issuesSummary.match(/Invalid maxRedirects, ignored \(must be a number of 0 or more\)/g)).toHaveLength(
        OFFENDERS.length
      );
    });

    for (const requestName of OFFENDERS) {
      await test.step(`${requestName} falls back to the default`, async () => {
        await expectMaxRedirects(page, requestName, String(DEFAULT_MAX_REDIRECTS));
      });
    }
  });
});
