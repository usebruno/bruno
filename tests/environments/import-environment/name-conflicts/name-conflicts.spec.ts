import path from 'path';
import { test, expect } from '../../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  importEnvironment,
  openImportReview,
  clickOutsideModal,
  openEnvironmentSelector
} from '../../../utils/page';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);

test.describe('Import environment - name conflict handling', () => {
  test.describe('collection scope', () => {
    test.afterEach(async ({ page }) => {
      await closeAllCollections(page);
    });

    test('importing an environment with no naming conflict commits immediately without a review step', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-none', await createTmpDir('name-conflict-none'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('development-env.json'));

      await test.step('No conflict with the existing "Production" environment, so the review step never appears', async () => {
        await expect(environment.importModal('collection')).toBeHidden();
        await expect(environment.sidebarListItem('collection', 'Development')).toBeVisible();
        await expect(environment.sidebarListItem('collection', 'Production')).toBeVisible();
      });
    });

    test('flags a name conflict and offers Replace / Import as Copy resolution', async ({ page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-flag', await createTmpDir('name-conflict-flag'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await test.step('Re-importing the same name surfaces it as a duplicate', async () => {
        await openImportReview(page, 'collection', fixture('production-env-updated.json'));

        await expect(environment.importDuplicatesWarning()).toContainText('1 environment');
        await expect(environment.importDuplicatesGroup()).toBeVisible();
        await expect(environment.importDuplicatesCount()).toHaveText('1');
        await expect(environment.importNewGroup()).toHaveCount(0);
      });

      await test.step('Copy is the default resolution and can be switched to Replace', async () => {
        const item = environment.importReviewItem('Production');
        await expect(item).toBeVisible();
        await expect(environment.importCopyButton('Production')).toHaveAttribute('aria-pressed', 'true');
        await expect(environment.importReplaceButton('Production')).toHaveAttribute('aria-pressed', 'false');

        await environment.importReplaceButton('Production').click();

        await expect(environment.importReplaceButton('Production')).toHaveAttribute('aria-pressed', 'true');
        await expect(environment.importCopyButton('Production')).toHaveAttribute('aria-pressed', 'false');
      });

      await modal.closeButton().click();
    });

    test('Replace overwrites the existing environment in place', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-replace', await createTmpDir('name-conflict-replace'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'));
      await environment.importReplaceButton('Production').click();
      await environment.importSubmitButton('collection').click();

      await test.step('Only one Production environment remains, holding the new variables', async () => {
        await expect(environment.sidebarListItem('collection', 'Production')).toHaveCount(1);
        await environment.sidebarListItem('collection', 'Production').click();
        await expect(environment.varRowValueCell('api_url')).toBeVisible();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.updated.example.com');
        await expect(environment.varRow('api_version')).toBeVisible();

        await expect(environment.varRow('api_key')).toHaveCount(0);
      });
    });

    test('Import as Copy adds a suffixed environment without touching the original', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-copy', await createTmpDir('name-conflict-copy'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'));
      // Copy is the default resolution.
      await environment.importSubmitButton('collection').click();

      await test.step('Both the original and the copy exist side by side', async () => {
        await expect(environment.sidebarListItemExact('collection', 'Production')).toBeVisible();
        await expect(environment.sidebarListItemExact('collection', 'Production copy')).toBeVisible();

        await environment.sidebarListItemExact('collection', 'Production').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.example.com');

        await environment.sidebarListItemExact('collection', 'Production copy').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.updated.example.com');
      });
    });

    test('skipping a duplicate still imports the other new environments in the batch', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-skip', await createTmpDir('name-conflict-skip'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'), fixture('development-env.json'));
      await environment.importItemCheckbox('Production').uncheck();
      await environment.importSubmitButton('collection').click();

      await test.step('Development is imported; Production is left untouched', async () => {
        await expect(environment.sidebarListItem('collection', 'Development')).toBeVisible();
        await expect(environment.sidebarListItem('collection', 'Production copy')).toHaveCount(0);

        await environment.sidebarListItem('collection', 'Production').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.example.com');
      });
    });

    test('the accordion-level select-all checkbox toggles environments in its group and updates the footer selection count', async ({ page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-select-all', await createTmpDir('name-conflict-select-all'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'), fixture('development-env.json'));

      await expect(environment.importTotalCount()).toHaveText('2');
      await expect(environment.importSelectedCount()).toContainText('2 of 2 selected');

      await environment.importNewGroupSelectAllCheckbox().uncheck();
      await expect(environment.importSelectedCount()).toContainText('1 of 2 selected');

      await environment.importDuplicatesGroupSelectAllCheckbox().uncheck();
      await expect(environment.importSelectedCount()).toContainText('0 of 2 selected');

      await environment.importNewGroupSelectAllCheckbox().check();
      await expect(environment.importSelectedCount()).toContainText('1 of 2 selected');

      await environment.importDuplicatesGroupSelectAllCheckbox().check();
      await expect(environment.importSelectedCount()).toContainText('2 of 2 selected');

      await modal.closeButton().click();
    });

    test('the group dropdown applies one resolution to every duplicate at once', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-apply-all', await createTmpDir('name-conflict-apply-all'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('staging-env.json'));
      await expect(environment.importModal('collection')).toBeHidden();

      await openImportReview(page, 'collection', fixture('production-env-updated.json'), fixture('staging-env-updated.json'));

      await test.step('Selecting "Replace existing" from the group dropdown flips both items', async () => {
        await expect(environment.importDuplicatesCount()).toHaveText('2');
        await environment.importGroupDropdownTrigger().click();
        await environment.importGroupDropdownReplaceOption().click();

        await expect(environment.importReplaceButton('Production')).toHaveAttribute('aria-pressed', 'true');
      });

      await environment.importSubmitButton('collection').click();

      await test.step('Both existing environments were replaced, no copies created', async () => {
        await expect(environment.sidebarListItem('collection', 'Production')).toHaveCount(1);
        await expect(environment.sidebarListItem('collection', 'Staging')).toHaveCount(1);

        await environment.sidebarListItem('collection', 'Production').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.updated.example.com');

        await environment.sidebarListItem('collection', 'Staging').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://staging-v2.example.com');
      });
    });

    test('closing the review dialog cancels the whole import', async ({ page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-cancel', await createTmpDir('name-conflict-cancel'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'), fixture('development-env.json'));
      await expect(environment.importModal('collection')).toBeVisible();

      await modal.closeButton().click();

      await test.step('Nothing from the pending import was persisted', async () => {
        await expect(environment.importModal('collection')).toBeHidden();
        await expect(environment.sidebarListItem('collection', 'Development')).toHaveCount(0);

        await environment.sidebarListItem('collection', 'Production').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.example.com');
      });
    });

    test('clicking outside the modal does not close it', async ({ page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-backdrop', await createTmpDir('name-conflict-backdrop'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'));
      const importModal = environment.importModal('collection');
      await expect(importModal).toBeVisible();

      await clickOutsideModal(page);

      await expect(importModal).toBeVisible();

      await modal.closeButton().click();
    });

    test('multiple environments with the same name in one batch are deduped without a conflict prompt', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-batch-dedupe', await createTmpDir('name-conflict-batch-dedupe'));

      const importModal = environment.importModal('collection');

      await test.step('Import a file whose environments array has two entries named "Test"', async () => {
        await openEnvironmentSelector(page, 'collection');
        await environment.importEmptyStateButton().click();
        await expect(importModal).toBeVisible();
        const fileChooserPromise = page.waitForEvent('filechooser');
        await environment.importFileTrigger('collection').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(fixture('duplicate-names-in-batch.json'));
      });

      await test.step('Neither entry conflicts with an existing environment, so the import commits immediately', async () => {
        await expect(importModal).toBeHidden();
        await expect(environment.sidebarListItemExact('collection', 'Test')).toBeVisible();
        await expect(environment.sidebarListItemExact('collection', 'Test copy')).toBeVisible();
      });
    });

    test('multiple Postman environment exports with the same name are deduped without a conflict prompt', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-postman-dedupe', await createTmpDir('name-conflict-postman-dedupe'));

      const importModal = environment.importModal('collection');

      await test.step('Import two separate Postman environment exports that both happen to be named "Test"', async () => {
        await openEnvironmentSelector(page, 'collection');
        await environment.importEmptyStateButton().click();
        await expect(importModal).toBeVisible();
        const fileChooserPromise = page.waitForEvent('filechooser');
        await environment.importFileTrigger('collection').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([fixture('postman-env-duplicate-a.json'), fixture('postman-env-duplicate-b.json')]);
      });

      await test.step('Neither entry conflicts with an existing environment, so the import commits immediately', async () => {
        await expect(importModal).toBeHidden();
        await expect(environment.sidebarListItemExact('collection', 'Test')).toBeVisible();
        await expect(environment.sidebarListItemExact('collection', 'Test copy')).toBeVisible();
      });
    });

    test('a batch with both a name conflict and an invalid file resolves the conflict and reports the invalid file separately', async ({ page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-with-invalid', await createTmpDir('name-conflict-with-invalid'));
      await importEnvironment(page, fixture('production-env.json'), 'collection');

      await openImportReview(page, 'collection', fixture('production-env-updated.json'), fixture('malformed.json'));

      await test.step('The duplicate and the invalid file are both flagged, independently of each other', async () => {
        await expect(environment.importDuplicatesCount()).toHaveText('1');
        await expect(environment.importInvalidCount()).toHaveText('1');
        await expect(environment.importInvalidItem('malformed.json')).toBeVisible();
      });

      await environment.importReplaceButton('Production').click();
      await environment.importSubmitButton('collection').click();

      await test.step('Production was replaced; the invalid file did not block the import', async () => {
        await expect(environment.sidebarListItem('collection', 'Production')).toHaveCount(1);
        await environment.sidebarListItem('collection', 'Production').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.updated.example.com');
      });
    });
  });

  test.describe('global scope', () => {
    test('importing a global environment with no naming conflict commits immediately without a review step', async ({ newPage: page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-global-none', await createTmpDir('name-conflict-global-none'));
      await importEnvironment(page, fixture('production-env.json'), 'global');

      await openImportReview(page, 'global', fixture('development-env.json'));

      await test.step('No conflict with the existing "Production" environment, so the review step never appears', async () => {
        await expect(environment.importModal('global')).toBeHidden();
        await expect(environment.sidebarListItem('global', 'Development')).toBeVisible();
        await expect(environment.sidebarListItem('global', 'Production')).toBeVisible();
      });

      await closeAllCollections(page);
    });

    test('duplicate handling (Replace and Import as Copy) works the same way for global environments', async ({ newPage: page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-global', await createTmpDir('name-conflict-global'));
      await importEnvironment(page, fixture('production-env.json'), 'global');

      await test.step('Replace overwrites the existing global environment', async () => {
        await openImportReview(page, 'global', fixture('production-env-updated.json'));
        await environment.importReplaceButton('Production').click();
        await environment.importSubmitButton('global').click();

        await expect(environment.sidebarListItem('global', 'Production')).toHaveCount(1);
        await environment.sidebarListItem('global', 'Production').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.updated.example.com');
      });

      await test.step('Import as Copy adds a second global environment alongside the original', async () => {
        await openImportReview(page, 'global', fixture('production-env.json'));
        await environment.importSubmitButton('global').click();

        await expect(environment.sidebarListItem('global', 'Production copy')).toBeVisible();
      });

      await closeAllCollections(page);
    });

    test('skipping a duplicate still imports the other new global environments in the batch', async ({ newPage: page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-global-skip', await createTmpDir('name-conflict-global-skip'));
      await importEnvironment(page, fixture('production-env.json'), 'global');

      await openImportReview(page, 'global', fixture('production-env-updated.json'), fixture('development-env.json'));
      await environment.importItemCheckbox('Production').uncheck();
      await environment.importSubmitButton('global').click();

      await test.step('Development is imported; Production is left untouched', async () => {
        await expect(environment.sidebarListItem('global', 'Development')).toBeVisible();
        await expect(environment.sidebarListItem('global', 'Production copy')).toHaveCount(0);

        await environment.sidebarListItem('global', 'Production').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.example.com');
      });

      await closeAllCollections(page);
    });

    test('the group dropdown applies one resolution to every duplicate at once for global environments', async ({ newPage: page, createTmpDir }) => {
      const { environment } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-global-apply-all', await createTmpDir('name-conflict-global-apply-all'));
      await importEnvironment(page, fixture('production-env.json'), 'global');

      await openImportReview(page, 'global', fixture('staging-env.json'));
      await expect(environment.importModal('global')).toBeHidden();

      await openImportReview(page, 'global', fixture('production-env-updated.json'), fixture('staging-env-updated.json'));

      await test.step('Selecting "Replace existing" from the group dropdown flips both items', async () => {
        await expect(environment.importDuplicatesCount()).toHaveText('2');
        await environment.importGroupDropdownTrigger().click();
        await environment.importGroupDropdownReplaceOption().click();

        await expect(environment.importReplaceButton('Production')).toHaveAttribute('aria-pressed', 'true');
      });

      await environment.importSubmitButton('global').click();

      await test.step('Both existing global environments were replaced, no copies created', async () => {
        await expect(environment.sidebarListItem('global', 'Production')).toHaveCount(1);
        await expect(environment.sidebarListItem('global', 'Staging')).toHaveCount(1);

        await environment.sidebarListItem('global', 'Production').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.updated.example.com');

        await environment.sidebarListItem('global', 'Staging').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://staging-v2.example.com');
      });

      await closeAllCollections(page);
    });

    test('closing the review dialog cancels the whole import for global environments', async ({ newPage: page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-global-cancel', await createTmpDir('name-conflict-global-cancel'));
      await importEnvironment(page, fixture('production-env.json'), 'global');

      await openImportReview(page, 'global', fixture('production-env-updated.json'), fixture('development-env.json'));
      await expect(environment.importModal('global')).toBeVisible();

      await modal.closeButton().click();

      await test.step('Nothing from the pending import was persisted', async () => {
        await expect(environment.importModal('global')).toBeHidden();
        await expect(environment.sidebarListItem('global', 'Development')).toHaveCount(0);

        await environment.sidebarListItem('global', 'Production').click();
        await expect(environment.varRowLine('api_url')).toHaveText('https://api.example.com');
      });

      await closeAllCollections(page);
    });

    test('clicking outside the modal does not close it for global environments', async ({ newPage: page, createTmpDir }) => {
      const { environment, modal } = buildCommonLocators(page);
      await createCollection(page, 'name-conflict-global-backdrop', await createTmpDir('name-conflict-global-backdrop'));
      await importEnvironment(page, fixture('production-env.json'), 'global');

      await openImportReview(page, 'global', fixture('production-env-updated.json'));
      const importModal = environment.importModal('global');
      await expect(importModal).toBeVisible();

      await clickOutsideModal(page);

      await expect(importModal).toBeVisible();

      await modal.closeButton().click();
      await closeAllCollections(page);
    });
  });
});
