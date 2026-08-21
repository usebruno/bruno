import path from 'path';
import { test, expect, Page } from '../../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  importEnvironment,
  openEnvironmentConfigTab,
  openEnvironmentSelector
} from '../../../utils/page';

type EnvironmentScope = 'collection' | 'global';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);

const openImportReview = async (page: Page, scope: EnvironmentScope, ...filePaths: string[]) => {
  const locators = buildCommonLocators(page);
  await openEnvironmentConfigTab(page, scope);
  await locators.environment.importSettingsButton().click();
  await expect(locators.environment.importModal(scope)).toBeVisible();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await locators.environment.importFileTrigger(scope).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePaths);
};

test.describe('Import environment - name conflict handling', () => {
  test.describe('collection scope', () => {
    test.afterEach(async ({ page }) => {
      await closeAllCollections(page);
    });

    test('flags a name conflict and offers Replace / Import as Copy resolution', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-flag', await createTmpDir('name-conflict-flag'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await test.step('Re-importing the same name surfaces it as a duplicate', async () => {
        await openImportReview(page, 'collection', fixture('production-env-updated.json'));

        await expect(locators.environment.importDuplicatesWarning()).toContainText('1 environment');
        await expect(locators.environment.importDuplicatesGroup()).toBeVisible();
        await expect(locators.environment.importDuplicatesCount()).toHaveText('1');
        await expect(locators.environment.importNewGroup()).toHaveCount(0);
      });

      await test.step('Copy is the default resolution and can be switched to Replace', async () => {
        const item = locators.environment.importReviewItem('Production');
        await expect(item).toBeVisible();
        await expect(locators.environment.importCopyButton('Production')).toHaveAttribute('title', 'Import as copy');
        await locators.environment.importReplaceButton('Production').click();
      });

      await page.getByTestId('modal-close-button').click();
    });

    test('Replace overwrites the existing environment in place', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-replace', await createTmpDir('name-conflict-replace'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'));
      await locators.environment.importReplaceButton('Production').click();
      await locators.environment.importSubmitButton('collection').click();

      await test.step('Only one Production environment remains, holding the new variables', async () => {
        await expect(locators.environment.sidebarListItem('collection', 'Production')).toHaveCount(1);
        await locators.environment.sidebarListItem('collection', 'Production').click();
        await expect(locators.environment.varRowValueCell('api_url')).toBeVisible();
        await expect(locators.environment.varRowLine('api_url')).toHaveText('https://api.updated.example.com');
        await expect(locators.environment.varRow('api_version')).toBeVisible();
      });
    });

    test('Import as Copy adds a suffixed environment without touching the original', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-copy', await createTmpDir('name-conflict-copy'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'));
      // Copy is the default resolution.
      await locators.environment.importSubmitButton('collection').click();

      await test.step('Both the original and the copy exist side by side', async () => {
        await expect(locators.environment.sidebarListItemExact('collection', 'Production')).toBeVisible();
        await expect(locators.environment.sidebarListItemExact('collection', 'Production copy')).toBeVisible();

        await locators.environment.sidebarListItemExact('collection', 'Production').click();
        await expect(locators.environment.varRowLine('api_url')).toHaveText('https://api.example.com');

        await locators.environment.sidebarListItemExact('collection', 'Production copy').click();
        await expect(locators.environment.varRowLine('api_url')).toHaveText('https://api.updated.example.com');
      });
    });

    test('skipping a duplicate still imports the other new environments in the batch', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-skip', await createTmpDir('name-conflict-skip'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'), fixture('development-env.json'));
      await locators.environment.importItemCheckbox('Production').uncheck();
      await locators.environment.importSubmitButton('collection').click();

      await test.step('Development is imported; Production is left untouched', async () => {
        await expect(locators.environment.sidebarListItem('collection', 'Development')).toBeVisible();
        await expect(locators.environment.sidebarListItem('collection', 'Production copy')).toHaveCount(0);

        await locators.environment.sidebarListItem('collection', 'Production').click();
        await expect(locators.environment.varRowLine('api_url')).toHaveText('https://api.example.com');
      });
    });

    test('the group dropdown applies one resolution to every duplicate at once', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-apply-all', await createTmpDir('name-conflict-apply-all'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');
      await openImportReview(page, 'collection', fixture('staging-env.json'));
      await locators.environment.importSubmitButton('collection').click();

      await openImportReview(page, 'collection', fixture('production-env-updated.json'), fixture('staging-env-updated.json'));

      await test.step('Selecting "Replace existing" from the group dropdown flips both items', async () => {
        await expect(locators.environment.importDuplicatesCount()).toHaveText('2');
        await locators.environment.importGroupDropdownTrigger().click();
        await locators.environment.importGroupDropdownReplaceOption().click();

        await expect(locators.environment.importReplaceButton('Production')).toHaveAttribute('title', 'Replace existing');
      });

      await locators.environment.importSubmitButton('collection').click();

      await test.step('Both existing environments were replaced, no copies created', async () => {
        await expect(locators.environment.sidebarListItem('collection', 'Production')).toHaveCount(1);
        await expect(locators.environment.sidebarListItem('collection', 'Staging')).toHaveCount(1);

        await locators.environment.sidebarListItem('collection', 'Production').click();
        await expect(locators.environment.varRowLine('api_url')).toHaveText('https://api.updated.example.com');

        await locators.environment.sidebarListItem('collection', 'Staging').click();
        await expect(locators.environment.varRowLine('api_url')).toHaveText('https://staging-v2.example.com');
      });
    });

    test('closing the review dialog cancels the whole import', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-cancel', await createTmpDir('name-conflict-cancel'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'), fixture('development-env.json'));
      await expect(locators.environment.importModal('collection')).toBeVisible();

      await page.getByTestId('modal-close-button').click();

      await test.step('Nothing from the pending import was persisted', async () => {
        await expect(locators.environment.importModal('collection')).toBeHidden();
        await expect(locators.environment.sidebarListItem('collection', 'Development')).toHaveCount(0);

        await locators.environment.sidebarListItem('collection', 'Production').click();
        await expect(locators.environment.varRowLine('api_url')).toHaveText('https://api.example.com');
      });
    });

    test('clicking outside the modal does not close it', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-backdrop', await createTmpDir('name-conflict-backdrop'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'));
      const modal = locators.environment.importModal('collection');
      await expect(modal).toBeVisible();

      await page.mouse.click(5, 5);

      await expect(modal).toBeVisible();

      await page.getByTestId('modal-close-button').click();
    });

    test('multiple environments with the same name in one batch are deduped without a conflict prompt', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-batch-dedupe', await createTmpDir('name-conflict-batch-dedupe'));

      await test.step('Import a file whose environments array has two entries named "Test"', async () => {
        await openEnvironmentSelector(page, 'collection');
        await locators.environment.importEmptyStateButton().click();
        await expect(locators.environment.importModal('collection')).toBeVisible();
        const fileChooserPromise = page.waitForEvent('filechooser');
        await locators.environment.importFileTrigger('collection').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(fixture('duplicate-names-in-batch.json'));
      });

      await test.step('Both entries land in New, not Duplicates, still shown under their original name', async () => {
        await expect(locators.environment.importDuplicatesGroup()).toHaveCount(0);
        await expect(locators.environment.importNewCount()).toHaveText('2');
        await expect(locators.environment.importReviewItem('Test')).toHaveCount(2);
      });

      await locators.environment.importSubmitButton('collection').click();

      await test.step('The name clash is only resolved once the import is committed', async () => {
        await expect(locators.environment.sidebarListItemExact('collection', 'Test')).toBeVisible();
        await expect(locators.environment.sidebarListItemExact('collection', 'Test copy')).toBeVisible();
      });
    });

    test('an invalid or unsupported file blocks the import and reports the error', async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-invalid', await createTmpDir('name-conflict-invalid'));

      await openEnvironmentSelector(page, 'collection');
      await locators.environment.importEmptyStateButton().click();
      const importModal = locators.environment.importModal('collection');
      await expect(importModal).toBeVisible();

      const fileChooserPromise = page.waitForEvent('filechooser');
      await locators.environment.importFileTrigger('collection').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(fixture('invalid-env.json'));

      await expect(locators.toast.byMessage('One or more environment files have an invalid or unsupported format')).toBeVisible();
      await expect(importModal).toBeVisible();
      await expect(locators.environment.sidebarListItem('collection', 'Invalid Env')).toHaveCount(0);

      await page.getByTestId('modal-close-button').click();
    });
  });

  test.describe('global scope', () => {
    test('duplicate handling (Replace and Import as Copy) works the same way for global environments', async ({ newPage: page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-global', await createTmpDir('name-conflict-global'));
      await importEnvironment(page, fixture('production-env.json'), 'global');

      await test.step('Replace overwrites the existing global environment', async () => {
        await openImportReview(page, 'global', fixture('production-env-updated.json'));
        await locators.environment.importReplaceButton('Production').click();
        await locators.environment.importSubmitButton('global').click();

        await expect(locators.environment.sidebarListItem('global', 'Production')).toHaveCount(1);
        await locators.environment.sidebarListItem('global', 'Production').click();
        await expect(locators.environment.varRowLine('api_url')).toHaveText('https://api.updated.example.com');
      });

      await test.step('Import as Copy adds a second global environment alongside the original', async () => {
        await openImportReview(page, 'global', fixture('production-env.json'));
        await locators.environment.importSubmitButton('global').click();

        await expect(locators.environment.sidebarListItem('global', 'Production copy')).toBeVisible();
      });

      await closeAllCollections(page);
    });
  });
});
