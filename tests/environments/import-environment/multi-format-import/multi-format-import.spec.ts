import path from 'path';
import { test, expect, Page } from '../../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  openEnvironmentSelector
} from '../../../utils/page';

type EnvironmentScope = 'collection' | 'global';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);

const openImportReviewFromEmpty = async (page: Page, scope: EnvironmentScope, ...filePaths: string[]) => {
  const locators = buildCommonLocators(page);
  await openEnvironmentSelector(page, scope);
  await locators.environment.importEmptyStateButton().click();
  await expect(locators.environment.importModal(scope)).toBeVisible();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await locators.environment.importFileTrigger(scope).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePaths);
};

test.describe('Import environment - mixed format and invalid file handling', () => {
  test.describe('collection scope', () => {
    test.afterEach(async ({ page }) => {
      await closeAllCollections(page);
    });

    test('imports Postman and Bruno environment files selected together in one batch', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'multi-format-mixed', await createTmpDir('multi-format-mixed'));

      await openImportReviewFromEmpty(page, 'collection', fixture('postman-env.json'), fixture('bruno-env.json'));

      await test.step('Both files are parsed under New, regardless of which format each is', async () => {
        await expect(locators.environment.importInvalidGroup()).toHaveCount(0);
        await expect(locators.environment.importDuplicatesGroup()).toHaveCount(0);
        await expect(locators.environment.importNewCount()).toHaveText('2');
        await expect(locators.environment.importReviewItem('Postman Env')).toBeVisible();
        await expect(locators.environment.importReviewItem('Bruno Env')).toBeVisible();
      });

      await locators.environment.importSubmitButton('collection').click();

      await test.step('Each environment is imported using its own format', async () => {
        await expect(locators.environment.sidebarListItemExact('collection', 'Postman Env')).toBeVisible();
        await expect(locators.environment.sidebarListItemExact('collection', 'Bruno Env')).toBeVisible();

        await locators.environment.sidebarListItemExact('collection', 'Postman Env').click();
        await expect(locators.environment.varRowLine('base_url')).toHaveText('https://postman.example.com');

        await locators.environment.sidebarListItemExact('collection', 'Bruno Env').click();
        await expect(locators.environment.varRowLine('base_url')).toHaveText('https://bruno.example.com');
      });
    });

    test('a malformed JSON file does not block the other valid files and is reported in the same dialog', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'multi-format-malformed', await createTmpDir('multi-format-malformed'));

      await openImportReviewFromEmpty(page, 'collection', fixture('malformed.json'), fixture('bruno-env.json'));

      await test.step('The malformed file is flagged as invalid; the valid one still lands under New', async () => {
        await expect(locators.environment.importDuplicatesWarning()).toContainText('1 file');
        await expect(locators.environment.importInvalidCount()).toHaveText('1');
        await expect(locators.environment.importInvalidItem('malformed.json')).toBeVisible();
        await expect(locators.environment.importNewCount()).toHaveText('1');
        await expect(locators.environment.importReviewItem('Bruno Env')).toBeVisible();
      });

      await locators.environment.importSubmitButton('collection').click();

      await test.step('Only the valid environment is actually imported', async () => {
        await expect(locators.environment.sidebarListItemExact('collection', 'Bruno Env')).toBeVisible();
      });
    });

    test('a schema-invalid file does not block valid files and shows its failure reason', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'multi-format-schema-invalid', await createTmpDir('multi-format-schema-invalid'));

      await openImportReviewFromEmpty(page, 'collection', fixture('invalid-schema.json'), fixture('postman-env.json'));

      await test.step('The bad-schema file shows its failure reason; the Postman file still imports', async () => {
        await expect(locators.environment.importInvalidCount()).toHaveText('1');
        const invalidItem = locators.environment.importInvalidItem('invalid-schema.json');
        await expect(invalidItem).toBeVisible();
        await expect(invalidItem).toContainText('missing or invalid variables array');
        await expect(locators.environment.importReviewItem('Postman Env')).toBeVisible();
      });

      await locators.environment.importSubmitButton('collection').click();

      await test.step('Only the valid environment is actually imported', async () => {
        await expect(locators.environment.sidebarListItemExact('collection', 'Postman Env')).toBeVisible();
      });
    });

    test('multiple invalid files across the batch are all reported without blocking the valid ones', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'multi-format-multiple-invalid', await createTmpDir('multi-format-multiple-invalid'));

      await openImportReviewFromEmpty(
        page,
        'collection',
        fixture('malformed.json'),
        fixture('invalid-schema.json'),
        fixture('bruno-env.json'),
        fixture('postman-env.json')
      );

      await test.step('Both bad files are listed; both good files land under New', async () => {
        await expect(locators.environment.importInvalidCount()).toHaveText('2');
        await expect(locators.environment.importInvalidItem('malformed.json')).toBeVisible();
        await expect(locators.environment.importInvalidItem('invalid-schema.json')).toBeVisible();
        await expect(locators.environment.importNewCount()).toHaveText('2');
        await expect(locators.environment.importTotalCount()).toHaveText('4');
      });

      await locators.environment.importSubmitButton('collection').click();

      await test.step('Only the two valid environments are imported', async () => {
        await expect(locators.environment.sidebarListItemExact('collection', 'Bruno Env')).toBeVisible();
        await expect(locators.environment.sidebarListItemExact('collection', 'Postman Env')).toBeVisible();
      });
    });

    test('a batch with only invalid files disables Import and reports every failure', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'multi-format-all-invalid', await createTmpDir('multi-format-all-invalid'));

      await openImportReviewFromEmpty(page, 'collection', fixture('malformed.json'), fixture('invalid-schema.json'));

      await expect(locators.environment.importInvalidCount()).toHaveText('2');
      await expect(locators.environment.importNewGroup()).toHaveCount(0);
      await expect(locators.environment.importDuplicatesGroup()).toHaveCount(0);
      await expect(locators.environment.importSubmitButton('collection')).toBeDisabled();

      await page.getByTestId('modal-close-button').click();
    });
  });

  test.describe('global scope', () => {
    test('mixed Postman and Bruno files import correctly for global environments', async ({ newPage: page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'multi-format-global', await createTmpDir('multi-format-global'));

      await openImportReviewFromEmpty(page, 'global', fixture('postman-env.json'), fixture('bruno-env.json'));
      await locators.environment.importSubmitButton('global').click();

      await expect(locators.environment.sidebarListItemExact('global', 'Postman Env')).toBeVisible();
      await expect(locators.environment.sidebarListItemExact('global', 'Bruno Env')).toBeVisible();

      await closeAllCollections(page);
    });
  });
});
