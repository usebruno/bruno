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

const COLLECTION_NAME = 'Max Redirects Collection';

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

  test('should preserve usable maxRedirects values, including above the former ceiling of 50', async ({
    page,
    createTmpDir
  }) => {
    await importFixture(page, await createTmpDir('postman-max-redirects-happy'));

    await test.step('a limit far above 50 survives the import', async () => {
      await expectMaxRedirects(page, 'Above Old Ceiling', '1000');
    });

    await test.step('an ordinary limit is untouched', async () => {
      await expectMaxRedirects(page, 'Ordinary Limit', '7');
    });

    await test.step('exactly 50 is preserved', async () => {
      await expectMaxRedirects(page, 'At Old Ceiling', '50');
    });

    await test.step('zero is preserved rather than treated as absent', async () => {
      await expectMaxRedirects(page, 'No Redirects', '0');
    });

    await test.step('a request with no protocolProfileBehavior shows the default of 5', async () => {
      await expectMaxRedirects(page, 'Unset Limit', '5');
    });

    await test.step('a nested request keeps its own limit', async () => {
      await expandFolder(page, 'Reporting');
      await expectMaxRedirects(page, 'Nested Above Ceiling', '75');
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
        'Above Old Ceiling',
        'At Old Ceiling',
        'No Redirects',
        'Unset Limit',
        'Unlimited Limit',
        'Negative Limit',
        'Quoted Limit',
        'Fractional Limit'
      ]) {
        await expect(locators.sidebar.request(name)).toBeVisible();
      }

      await expandFolder(page, 'Reporting');
      await expect(locators.sidebar.request('Nested Above Ceiling')).toBeVisible();
    });

    await test.step('the toast reports warnings and claims no skipped items', async () => {
      const toastTitle = locators.import.issuesToastTitle();
      await expect(toastTitle).toBeVisible();
      await expect(toastTitle).toContainText('4 warning(s)');
      await expect(toastTitle).not.toContainText('skipped');
    });

    await test.step('warnings carry no request data, so no include-items checkbox appears', async () => {
      await expect(locators.import.issuesToastIncludeItemsCheckbox()).toBeHidden();
    });

    for (const requestName of ['Unlimited Limit', 'Negative Limit', 'Quoted Limit', 'Fractional Limit']) {
      await test.step(`${requestName} falls back to the default of 5`, async () => {
        await expectMaxRedirects(page, requestName, '5');
      });
    }
  });
});
