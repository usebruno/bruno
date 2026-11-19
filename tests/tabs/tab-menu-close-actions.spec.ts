import { expect, test } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  openCollection,
  openCollectionFromPath,
  openEnvironmentSelector,
  openRequest,
  selectTabContextMenuItem,
  waitForCollectionMount
} from '../utils/page';
import {
  collectionName,
  draftIndicator,
  editRequestUrlWithoutSaving,
  expectCollectionFilesUnchanged,
  expectCollectionFileToContain,
  openCollectionSettingsWithDraft,
  openEnvironmentWithDraft,
  openFolderSettingsWithDraft,
  openRequests
} from './helpers';

// The tab menu's bulk close actions (Close Others / Left / Right / All) must offer the same
// "Unsaved changes" choice as the Close All shortcut instead of silently saving every draft.
test.describe('Tab menu - bulk close actions with unsaved changes', () => {
  let collectionDir: string;

  // Each test gets its own copy of the fixture, so tests that press Save don't leak into the next one.
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    collectionDir = collectionFixturePath!;
    await openCollectionFromPath(page, electronApp, collectionDir);
    await waitForCollectionMount(page, collectionName);
    await openCollection(page, collectionName);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Close Others - lists all the tabs in draft state; Cancel - keeps every tab', async ({ page }) => {
    const { tabs, unsavedChangesModal } = buildCommonLocators(page);
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editRequestUrlWithoutSaving(page, 'req-1', '/req-1');
    await editRequestUrlWithoutSaving(page, 'req-2', '/req-2');
    await editRequestUrlWithoutSaving(page, 'req-3', '/req-3');

    await selectTabContextMenuItem(page, 'req-2', 'close-others');

    const modal = unsavedChangesModal.root();
    await test.step('Modal lists req-1 and req-3 but not the kept tab req-2', async () => {
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('Request: req-1');
      await expect(modal).toContainText('Request: req-3');
      await expect(modal).not.toContainText('Request: req-2');
    });

    await test.step('Cancel keeps every tab and draft, nothing written to disk', async () => {
      await unsavedChangesModal.button('Cancel').click();
      await expect(modal).not.toBeVisible();
      for (const name of ['req-1', 'req-2', 'req-3']) {
        await expect(tabs.tabByName(name)).toBeVisible();
        await expect(draftIndicator(page, name)).toBeVisible();
      }
      expectCollectionFilesUnchanged(collectionDir);
    });
  });

  test('Close Others - with "Don\'t Save" discards and closes all other tabs', async ({ page }) => {
    const { tabs, unsavedChangesModal } = buildCommonLocators(page);
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editRequestUrlWithoutSaving(page, 'req-1', '/req-1');
    await editRequestUrlWithoutSaving(page, 'req-2', '/req-2');

    await selectTabContextMenuItem(page, 'req-2', 'close-others');
    const modal = unsavedChangesModal.root();
    await expect(modal).toBeVisible();
    await unsavedChangesModal.button('Don\'t Save').click();

    await test.step('Only req-2 stays open, keeping its draft', async () => {
      await expect(tabs.tabByName('req-1')).not.toBeVisible();
      await expect(tabs.tabByName('req-3')).not.toBeVisible();
      await expect(tabs.tabByName('req-2')).toBeVisible();
      await expect(draftIndicator(page, 'req-2')).toBeVisible();
    });

    await test.step('Reopened req-1 has no draft and the fixture is untouched', async () => {
      await openRequest(page, collectionName, 'req-1', { persist: true });
      await expect(tabs.tabByName('req-1')).toBeVisible();
      await expect(draftIndicator(page, 'req-1')).not.toBeVisible();
      expectCollectionFilesUnchanged(collectionDir);
    });
  });

  test('Close to the Right - with Save saves and closes the tabs in range', async ({ page }) => {
    const { tabs, unsavedChangesModal, request } = buildCommonLocators(page);
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editRequestUrlWithoutSaving(page, 'req-3', '/req-3');
    await editRequestUrlWithoutSaving(page, 'req-1', '/req-1');

    await selectTabContextMenuItem(page, 'req-1', 'close-right');
    const modal = unsavedChangesModal.root();
    await test.step('Modal lists req-3 only, not the clicked tab req-1', async () => {
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('Request: req-3');
      await expect(modal).not.toContainText('Request: req-1');
    });
    await unsavedChangesModal.button('Save').click();

    await test.step('Only req-1 stays open, keeping its draft', async () => {
      await expect(tabs.tabByName('req-2')).not.toBeVisible();
      await expect(tabs.tabByName('req-3')).not.toBeVisible();
      await expect(tabs.tabByName('req-1')).toBeVisible();
      await expect(draftIndicator(page, 'req-1')).toBeVisible();
    });

    await test.step('Reopened req-3 shows the saved URL without a draft', async () => {
      await openRequest(page, collectionName, 'req-3', { persist: true });
      await expect(tabs.tabByName('req-3')).toBeVisible();
      await expect(draftIndicator(page, 'req-3')).not.toBeVisible();
      await expect(request.urlInput()).toContainText('/req-3');
    });
  });

  test('Close to the Left - closes immediately when nothing in range is unsaved', async ({ page }) => {
    const { tabs, unsavedChangesModal } = buildCommonLocators(page);
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editRequestUrlWithoutSaving(page, 'req-3', '/req-3');

    await selectTabContextMenuItem(page, 'req-3', 'close-left');

    await test.step('req-1 and req-2 close without a prompt; req-3 keeps its draft', async () => {
      await expect(tabs.tabByName('req-1')).not.toBeVisible();
      await expect(tabs.tabByName('req-2')).not.toBeVisible();
      await expect(unsavedChangesModal.root()).not.toBeVisible();
      await expect(tabs.tabByName('req-3')).toBeVisible();
      await expect(draftIndicator(page, 'req-3')).toBeVisible();
    });
  });

  test('Close All - from the tab menu asks before closing unsaved tabs', async ({ page }) => {
    const { tabs, unsavedChangesModal } = buildCommonLocators(page);
    await openRequests(page, ['req-1', 'req-2']);
    await editRequestUrlWithoutSaving(page, 'req-2', '/req-2');

    await selectTabContextMenuItem(page, 'req-1', 'close-all');
    const modal = unsavedChangesModal.root();
    await test.step('Modal lists only the unsaved req-2', async () => {
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('Request: req-2');
      await expect(modal).not.toContainText('Request: req-1');
    });

    await test.step('Don\'t Save closes both tabs, nothing written to disk', async () => {
      await unsavedChangesModal.button('Don\'t Save').click();
      await expect(tabs.tabByName('req-1')).not.toBeVisible();
      await expect(tabs.tabByName('req-2')).not.toBeVisible();
      expectCollectionFilesUnchanged(collectionDir);
    });
  });

  // Collection settings, folder settings and the environment editor have no tab menu of their
  // own, but they sit in the same tab strip, so a request tab's Close Left / Right sweeps them up.
  test('Close to the Left - lists collection, folder and environment drafts; Don\'t Save discards them', async ({ page }) => {
    const { tabs, unsavedChangesModal, environment, sidebar } = buildCommonLocators(page);
    await openCollectionSettingsWithDraft(page);
    await openFolderSettingsWithDraft(page);
    await openEnvironmentWithDraft(page, 'http://draft-left');
    await openRequests(page, ['req-1', 'req-2']);
    await editRequestUrlWithoutSaving(page, 'req-2', '/req-2');

    await selectTabContextMenuItem(page, 'req-1', 'close-left');

    const modal = unsavedChangesModal.root();
    await test.step('Modal lists the collection, folder and environment drafts only', async () => {
      await expect(modal).toBeVisible();
      await expect(modal).toContainText(`Collection: ${collectionName}`);
      await expect(modal).toContainText('Folder: admin');
      await expect(modal).toContainText('Collection Environment: Local');
      await expect(modal).not.toContainText('Request:');
    });

    await test.step('Cancel - keeps every settings draft', async () => {
      await unsavedChangesModal.button('Cancel').click();
      await expect(modal).not.toBeVisible();
      await expect(tabs.tabDraftIndicator(tabs.collectionSettingsTab())).toBeVisible();
      await expect(tabs.tabDraftIndicator(tabs.tabByName('admin'))).toBeVisible();
      await expect(tabs.tabCloseGradient(environment.collectionEnvTab())).toHaveClass(/has-changes/);
    });

    await test.step('Don\'t Save - discards the settings tabs and keeps the request tabs', async () => {
      await selectTabContextMenuItem(page, 'req-1', 'close-left');
      await expect(modal).toBeVisible();
      await unsavedChangesModal.button('Don\'t Save').click();

      await expect(tabs.collectionSettingsTab()).not.toBeVisible();
      await expect(tabs.tabByName('admin')).not.toBeVisible();
      await expect(environment.collectionEnvTab()).not.toBeVisible();
      await expect(tabs.tabByName('req-1')).toBeVisible();
      await expect(tabs.tabByName('req-2')).toBeVisible();
      await expect(draftIndicator(page, 'req-2')).toBeVisible();
    });

    await test.step('Reopened settings have no draft and the fixture is untouched', async () => {
      await sidebar.collectionRow(collectionName).dblclick();
      await expect(tabs.collectionSettingsTab()).toBeVisible();
      await expect(tabs.tabDraftIndicator(tabs.collectionSettingsTab())).not.toBeVisible();
      await sidebar.folder('admin').dblclick();
      await expect(tabs.tabByName('admin')).toBeVisible();
      await expect(tabs.tabDraftIndicator(tabs.tabByName('admin'))).not.toBeVisible();
      expectCollectionFilesUnchanged(collectionDir);
    });
  });

  test('Close to the Right - lists collection, folder and environment drafts; Save All saves them', async ({ page }) => {
    const { tabs, unsavedChangesModal, environment } = buildCommonLocators(page);
    await openRequests(page, ['req-1']);
    await editRequestUrlWithoutSaving(page, 'req-1', '/req-1');
    await openCollectionSettingsWithDraft(page);
    await openFolderSettingsWithDraft(page);
    await openEnvironmentWithDraft(page, 'http://saved-right');

    await selectTabContextMenuItem(page, 'req-1', 'close-right');

    const modal = unsavedChangesModal.root();
    await test.step('Modal lists the collection, folder and environment drafts only', async () => {
      await expect(modal).toBeVisible();
      await expect(modal).toContainText(`Collection: ${collectionName}`);
      await expect(modal).toContainText('Folder: admin');
      await expect(modal).toContainText('Collection Environment: Local');
      await expect(modal).not.toContainText('Request: req-1');
    });

    await unsavedChangesModal.button('Save All').click();

    await test.step('Settings tabs close and req-1 keeps its draft', async () => {
      await expect(tabs.collectionSettingsTab()).not.toBeVisible();
      await expect(tabs.tabByName('admin')).not.toBeVisible();
      await expect(environment.collectionEnvTab()).not.toBeVisible();
      await expect(tabs.tabByName('req-1')).toBeVisible();
      await expect(draftIndicator(page, 'req-1')).toBeVisible();
    });

    await test.step('Collection, folder and environment drafts are written to disk', async () => {
      await expectCollectionFileToContain(collectionDir, 'opencollection.yml', '// draft');
      await expectCollectionFileToContain(collectionDir, 'admin/folder.yml', '// draft');
      await expectCollectionFileToContain(collectionDir, 'environments/Local.yml', 'http://saved-right');
    });

    await test.step('Reopened environment editor shows the saved value without a draft', async () => {
      await openEnvironmentSelector(page, 'collection');
      await environment.configureButton().click();
      await expect(environment.collectionEnvTab()).toBeVisible();
      await expect(environment.variableValue('host')).toContainText('http://saved-right');
      await expect(tabs.tabCloseGradient(environment.collectionEnvTab())).not.toHaveClass(/has-changes/);
    });
  });

  test('Inspect tab - clicking on this option the modal focuses that tab and keeps everything open', async ({ page }) => {
    const { tabs, unsavedChangesModal } = buildCommonLocators(page);
    await openRequests(page, ['req-1', 'req-2', 'req-3']);
    await editRequestUrlWithoutSaving(page, 'req-3', '/req-3');
    await tabs.tabByName('req-1').click();
    await expect(tabs.tabByName('req-1')).toHaveClass(/active/);

    await selectTabContextMenuItem(page, 'req-1', 'close-right');
    const modal = unsavedChangesModal.root();
    await expect(modal).toBeVisible();

    await test.step('Inspect req-3 from the modal', async () => {
      await unsavedChangesModal.item('Request: req-3').hover();
      await unsavedChangesModal.inspectTabButton('Request: req-3').click();
    });

    await test.step('Modal closes, req-3 is active and every tab is still open', async () => {
      await expect(modal).not.toBeVisible();
      await expect(tabs.tabByName('req-3')).toHaveClass(/active/);
      for (const name of ['req-1', 'req-2', 'req-3']) {
        await expect(tabs.tabByName(name)).toBeVisible();
      }
      await expect(draftIndicator(page, 'req-3')).toBeVisible();
    });
  });
});
