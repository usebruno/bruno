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
  const { environment } = buildCommonLocators(page);
  await openEnvironmentSelector(page, scope);
  await environment.importEmptyStateButton().click();
  await expect(environment.importModal(scope)).toBeVisible();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await environment.importFileTrigger(scope).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePaths);
};

test.describe('Import environment - mixed format and invalid file handling', () => {
  test.describe('collection scope', () => {
    test.afterEach(async ({ page }) => {
      await closeAllCollections(page);
    });

    test('imports Postman and Bruno environment files selected together in one batch', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-mixed', await createTmpDir('multi-format-mixed'));

      await openImportReviewFromEmpty(page, 'collection', fixture('postman-env.json'), fixture('bruno-env.json'));

      await test.step('Review step shows both files as New, then imports them', async () => {
        await expect(environment.importNewBadge('Postman Env')).toBeVisible();
        await expect(environment.importNewBadge('Bruno Env')).toBeVisible();

        await environment.importSubmitButton('collection').click();

        await expect(environment.importModal('collection')).toBeHidden();
        await expect(environment.sidebarListItemExact('collection', 'Postman Env')).toBeVisible();
        await expect(environment.sidebarListItemExact('collection', 'Bruno Env')).toBeVisible();

        await environment.sidebarListItemExact('collection', 'Postman Env').click();
        await expect(environment.varRowLine('base_url')).toHaveText('https://postman.example.com');

        await environment.sidebarListItemExact('collection', 'Bruno Env').click();
        await expect(environment.varRowLine('base_url')).toHaveText('https://bruno.example.com');
      });
    });

    test('a malformed JSON file does not block the other valid files and is reported in the same dialog', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-malformed', await createTmpDir('multi-format-malformed'));

      await openImportReviewFromEmpty(page, 'collection', fixture('malformed.json'), fixture('bruno-env.json'));

      await test.step('The malformed file is flagged as invalid; the valid one is New', async () => {
        await expect(environment.importInvalidBadge('malformed.json')).toBeVisible();
        await expect(environment.importNewBadge('Bruno Env')).toBeVisible();
        await expect(environment.importItemCheckbox('malformed.json')).toBeDisabled();
      });

      await environment.importSubmitButton('collection').click();

      await test.step('Only the valid environment is actually imported', async () => {
        await expect(environment.sidebarListItemExact('collection', 'Bruno Env')).toBeVisible();
        await expect(environment.sidebarListItemExact('collection', 'malformed.json')).toBeHidden();
      });
    });

    test('a file whose JSON root is null does not block the other valid files', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-null-content', await createTmpDir('multi-format-null-content'));

      await openImportReviewFromEmpty(page, 'collection', fixture('null-content.json'), fixture('bruno-env.json'));

      await test.step('The null-content file is flagged as invalid; the valid one is New', async () => {
        await expect(environment.importInvalidBadge('null-content.json')).toBeVisible();
        await expect(environment.importNewBadge('Bruno Env')).toBeVisible();
        await expect(environment.importItemCheckbox('null-content.json')).toBeDisabled();
      });

      await environment.importSubmitButton('collection').click();

      await test.step('Only the valid environment is actually imported', async () => {
        await expect(environment.sidebarListItemExact('collection', 'Bruno Env')).toBeVisible();
        await expect(environment.sidebarListItemExact('collection', 'null-content.json')).toBeHidden();
      });
    });

    test('a schema-invalid file does not block valid files and shows its failure reason', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-schema-invalid', await createTmpDir('multi-format-schema-invalid'));

      await openImportReviewFromEmpty(page, 'collection', fixture('invalid-schema.json'), fixture('postman-env.json'));

      await test.step('The bad-schema file shows its failure reason; the Postman file still imports', async () => {
        await expect(environment.importInvalidBadge('invalid-schema.json')).toBeVisible();
        const invalidItem = environment.importInvalidItem('invalid-schema.json');
        await expect(invalidItem).toContainText('missing or invalid variables array');
        await expect(environment.importNewBadge('Postman Env')).toBeVisible();
      });

      await environment.importSubmitButton('collection').click();

      await test.step('Only the valid environment is actually imported', async () => {
        await expect(environment.sidebarListItemExact('collection', 'Postman Env')).toBeVisible();
        await expect(environment.sidebarListItemExact('collection', 'invalid-schema.json')).toBeHidden();
      });
    });

    test('multiple invalid files across the batch are all reported without blocking the valid ones', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-multiple-invalid', await createTmpDir('multi-format-multiple-invalid'));

      await openImportReviewFromEmpty(
        page,
        'collection',
        fixture('malformed.json'),
        fixture('invalid-schema.json'),
        fixture('bruno-env.json'),
        fixture('postman-env.json')
      );

      await test.step('Both bad files are flagged invalid; both good files are New', async () => {
        await expect(environment.importInvalidBadge('malformed.json')).toBeVisible();
        await expect(environment.importInvalidBadge('invalid-schema.json')).toBeVisible();
        await expect(environment.importNewBadge('Bruno Env')).toBeVisible();
        await expect(environment.importNewBadge('Postman Env')).toBeVisible();
        await expect(environment.importTotalCount()).toHaveText('4');
      });

      await environment.importSubmitButton('collection').click();

      await test.step('Only the two valid environments are imported', async () => {
        await expect(environment.sidebarListItemExact('collection', 'Bruno Env')).toBeVisible();
        await expect(environment.sidebarListItemExact('collection', 'Postman Env')).toBeVisible();
      });
    });

    test('a batch with only invalid files disables Import and reports every failure', async ({ page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-all-invalid', await createTmpDir('multi-format-all-invalid'));

      await openImportReviewFromEmpty(page, 'collection', fixture('malformed.json'), fixture('invalid-schema.json'));

      await test.step('Both files are flagged as invalid and Next button stays disabled', async () => {
        await expect(environment.importInvalidBadge('malformed.json')).toBeVisible();
        await expect(environment.importInvalidBadge('invalid-schema.json')).toBeVisible();
        await expect(environment.importSubmitButton('collection')).toBeDisabled();
      });

      await modal.closeButton().click();
    });

    test('invalid environments are correctly filtered by search and group can be collapsed', async ({ page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-search-invalid', await createTmpDir('multi-format-search-invalid'));

      await openImportReviewFromEmpty(page, 'collection', fixture('malformed.json'), fixture('invalid-schema.json'));

      await test.step('Both invalid files are initially visible', async () => {
        await expect(environment.importInvalidBadge('malformed.json')).toBeVisible();
        await expect(environment.importInvalidBadge('invalid-schema.json')).toBeVisible();
      });

      await test.step('Searching filters the invalid items', async () => {
        await page.getByTestId('env-search-input').fill('malformed');
        await expect(environment.importInvalidItem('malformed.json')).toBeVisible();
        await expect(environment.importInvalidItem('invalid-schema.json')).toBeHidden();
      });

      await modal.closeButton().click();
    });
  });

  test.describe('global scope', () => {
    test('mixed Postman and Bruno files import correctly for global environments', async ({ newPage: page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-global', await createTmpDir('multi-format-global'));

      await openImportReviewFromEmpty(page, 'global', fixture('postman-env.json'), fixture('bruno-env.json'));

      await test.step('Review step shows both files as New, then imports them', async () => {
        await expect(environment.importNewBadge('Postman Env')).toBeVisible();
        await expect(environment.importNewBadge('Bruno Env')).toBeVisible();

        await environment.importSubmitButton('global').click();

        await expect(environment.importModal('global')).toBeHidden();
        await expect(environment.sidebarListItemExact('global', 'Postman Env')).toBeVisible();
        await expect(environment.sidebarListItemExact('global', 'Bruno Env')).toBeVisible();
      });

      await closeAllCollections(page);
    });
  });
});
