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

      await test.step('Both land under New and, once confirmed, import using their own format', async () => {
        await expect(environment.importNewCount()).toHaveText('2');
        await expect(environment.importSubmitButton('collection')).toHaveText('Import (2)');
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

      await test.step('The malformed file is flagged as invalid; the valid one still lands under New', async () => {
        await expect(environment.importInvalidWarning()).toContainText('1 could not be read and will be skipped');
        await expect(environment.importInvalidCount()).toHaveText('1');
        await expect(environment.importInvalidItem('malformed.json')).toBeVisible();
        await expect(environment.importNewCount()).toHaveText('1');
        await expect(environment.importReviewItem('Bruno Env')).toBeVisible();
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

      await test.step('The null-content file is flagged as invalid; the valid one still lands under New', async () => {
        await expect(environment.importInvalidCount()).toHaveText('1');
        await expect(environment.importInvalidItem('null-content.json')).toBeVisible();
        await expect(environment.importNewCount()).toHaveText('1');
        await expect(environment.importReviewItem('Bruno Env')).toBeVisible();
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
        await expect(environment.importInvalidCount()).toHaveText('1');
        const invalidItem = environment.importInvalidItem('invalid-schema.json');
        await expect(invalidItem).toBeVisible();
        await expect(invalidItem).toContainText('missing or invalid variables array');
        await expect(environment.importReviewItem('Postman Env')).toBeVisible();
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

      await test.step('Both bad files are listed; both good files land under New', async () => {
        await expect(environment.importInvalidCount()).toHaveText('2');
        await expect(environment.importInvalidItem('malformed.json')).toBeVisible();
        await expect(environment.importInvalidItem('invalid-schema.json')).toBeVisible();
        await expect(environment.importNewCount()).toHaveText('2');
        await expect(environment.importTotalCount()).toHaveText('4');
        await expect(environment.importSelectedCount()).toContainText('2/2 selected');
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

      await test.step('Both files are flagged as invalid and Import stays disabled', async () => {
        await expect(environment.importInvalidCount()).toHaveText('2');
        await expect(environment.importNewGroup()).toHaveCount(0);
        await expect(environment.importDuplicatesGroup()).toHaveCount(0);
        await expect(environment.importSubmitButton('collection')).toBeDisabled();
      });

      await modal.closeButton().click();
    });

    test('invalid environments are correctly filtered by search and group can be collapsed', async ({ page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-search-invalid', await createTmpDir('multi-format-search-invalid'));

      await openImportReviewFromEmpty(page, 'collection', fixture('malformed.json'), fixture('invalid-schema.json'));

      await test.step('Both invalid files are initially visible', async () => {
        await expect(environment.importInvalidCount()).toHaveText('2');
        await expect(environment.importInvalidItem('malformed.json')).toBeVisible();
        await expect(environment.importInvalidItem('invalid-schema.json')).toBeVisible();
      });

      await test.step('Searching filters the invalid items', async () => {
        await page.getByTestId('env-search-input').fill('malformed');
        await expect(environment.importInvalidItem('malformed.json')).toBeVisible();
        await expect(environment.importInvalidItem('invalid-schema.json')).toBeHidden();
      });

      await test.step('Toggling the chevron collapses the group', async () => {
        await page.getByTestId('env-search-input').fill(''); // clear search
        await page.getByTestId('env-import-invalid-group').locator('.group-title-wrapper').click();
        await expect(environment.importInvalidItem('malformed.json')).toBeHidden();
        await expect(environment.importInvalidItem('invalid-schema.json')).toBeHidden();
      });

      await modal.closeButton().click();
    });

    test('the review list follows the order the files were picked, not their format', async ({ page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-order', await createTmpDir('multi-format-order'));

      // Interleaved on purpose: grouping the batch by format used to pull both Postman files
      // ahead of the Bruno one regardless of the order they were chosen in.
      await openImportReviewFromEmpty(
        page,
        'collection',
        fixture('postman-env.json'),
        fixture('bruno-env.json'),
        fixture('postman-env-2.json')
      );

      await test.step('Rows appear in pick order', async () => {
        await expect(environment.importReviewItemNames()).toHaveText([
          'Postman Env',
          'Bruno Env',
          'Postman Env Two'
        ]);
      });

      await modal.closeButton().click();
    });

    test('filtering a batch with no conflicts does not conjure an empty Already exists group', async ({ page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-filter-empty', await createTmpDir('multi-format-filter-empty'));

      await openImportReviewFromEmpty(page, 'collection', fixture('postman-env.json'), fixture('bruno-env.json'));

      await test.step('No group exists for a status nothing in the batch has', async () => {
        await expect(environment.importDuplicatesGroup()).toHaveCount(0);
        await page.getByTestId('env-search-input').fill('bruno');
        await expect(environment.importDuplicatesGroup()).toHaveCount(0);
        await expect(environment.importNewCount()).toHaveText('1');
      });

      await test.step('A filter matching nothing at all leaves one message rather than empty groups', async () => {
        await page.getByTestId('env-search-input').fill('nothing-matches-this');
        await expect(environment.importNewGroup()).toHaveCount(0);
        await expect(environment.importDuplicatesGroup()).toHaveCount(0);
        await expect(page.getByTestId('env-import-no-matches')).toBeVisible();
      });

      await modal.closeButton().click();
    });
  });

  test.describe('global scope', () => {
    test('mixed Postman and Bruno files import correctly for global environments', async ({ newPage: page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'multi-format-global', await createTmpDir('multi-format-global'));

      await openImportReviewFromEmpty(page, 'global', fixture('postman-env.json'), fixture('bruno-env.json'));

      await test.step('Both land under New and, once confirmed, import using their own format', async () => {
        await environment.importSubmitButton('global').click();
        await expect(environment.importModal('global')).toBeHidden();
        await expect(environment.sidebarListItemExact('global', 'Postman Env')).toBeVisible();
        await expect(environment.sidebarListItemExact('global', 'Bruno Env')).toBeVisible();
      });

      await closeAllCollections(page);
    });
  });
});
