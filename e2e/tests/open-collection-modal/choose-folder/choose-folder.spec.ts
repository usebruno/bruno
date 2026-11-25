import * as path from 'path';
import { test, expect, ElectronApplication } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, dismissModalIfOpen, mockBrowseFiles, openCollectionFromDialog } from '../../../pages';
import {
  buildOpenCollectionModalLocators,
  closeOpenCollectionModal,
  pressOpenCollectionShortcut,
  showOpenCollectionModal
} from '../../../pages/open-collection-modal/shell';
import {
  buildChooseFolderLocators,
  chooseFolders,
  openListedCollection,
  selectListedCollections
} from '../../../pages/open-collection-modal/choose-folder';

const chooseFolderShortcut = process.platform === 'darwin' ? '⇧ ⌘ O' : 'Ctrl+Shift+O';

test.describe('Choose folder', () => {
  let electronApp: ElectronApplication;

  test.beforeEach(async ({ pageWithUserData, reuseOrLaunchElectronApp }, testInfo) => {
    electronApp = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeOpenCollectionModal(page);
    await dismissModalIfOpen(page);
    await closeAllCollections(page);
    await test.step('Wait for the toasts to disappear', async () => {
      await expect(buildCommonLocators(page).toast.all()).toHaveCount(0);
    });
  });

  test('shows the start page from its menu item and lists the folder picked from its choose link', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);

    await test.step('Make the folder picker pick the parent folder', async () => {
      await mockBrowseFiles(electronApp, [path.join(collectionFixturePath!, 'parent')]);
    });

    await showOpenCollectionModal(page, 'choose-folder');

    await test.step('Verify the start page, with the folder picker still closed', async () => {
      await expect(openCollectionModal.pageTitle()).toHaveText('Choose folder');
      await expect(chooseFolder.dropZone()).toContainText('Drop Bruno collection folders here');
      await expect(chooseFolder.dropZone()).toContainText('Bruno Collection folder has opencollection.yml or bruno.json at the root');
      await expect(chooseFolder.chooseLink()).toHaveText('choose folders');
      await expect(chooseFolder.shortcut()).toHaveText(chooseFolderShortcut);
      await expect(chooseFolder.list()).toHaveCount(0);
      await expect(openCollectionModal.note()).toHaveCount(0);
    });

    await test.step('Click the choose link', async () => {
      await chooseFolder.chooseLink().click();
    });

    await test.step('Verify the picked folder is listed', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });
  });

  test('opens a picked opencollection.yml collection folder right away', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const { sidebar, toast } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'single')]);

    await test.step('Verify the collection opens and the modal closes', async () => {
      await expect(toast.byMessage('Collection added to workspace')).toBeVisible();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Single Collection')).toBeVisible();
    });
  });

  test('opens a picked bruno.json collection folder right away', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const { sidebar, toast } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'bruno-json')]);

    await test.step('Verify the collection opens and the modal closes', async () => {
      await expect(toast.byMessage('Collection added to workspace')).toBeVisible();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Bruno JSON Collection')).toBeVisible();
    });
  });

  test('opens every picked collection folder at once', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const { sidebar, toast } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await chooseFolders(page, electronApp, [
      path.join(collectionFixturePath!, 'direct-one'),
      path.join(collectionFixturePath!, 'direct-two')
    ]);

    await test.step('Verify both collections open and the modal closes', async () => {
      await expect(toast.byMessage('Collections added to workspace')).toBeVisible();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Direct One')).toBeVisible();
      await expect(sidebar.collection('Direct Two')).toBeVisible();
    });
  });

  test('lists the collections inside a picked folder that is not a collection', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);
    const parentFolder = path.join(collectionFixturePath!, 'parent');

    await chooseFolders(page, electronApp, [parentFolder]);

    await test.step('Verify the note explains the folder and offers to search it', async () => {
      await expect(openCollectionModal.note()).toContainText('parent isn’t a collection itself, but it has 2 collections inside. Pick the ones to open.');
      await expect(openCollectionModal.noteActionButton()).toHaveText('Add to search locations');
    });

    await test.step('Verify the list shows each collection with the folder it sits in', async () => {
      await expect(chooseFolder.searchInput()).toHaveAttribute('placeholder', 'Search 2 collections');
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
      await expect(chooseFolder.rowPath('Parent Alpha')).toHaveAttribute('title', path.join(parentFolder, 'alpha'));
      await expect(chooseFolder.rowPath('Parent Beta')).toHaveAttribute('title', path.join(parentFolder, 'nested', 'deep', 'beta'));
      await expect(chooseFolder.rowMeta('Parent Alpha')).toHaveText('');
      await expect(chooseFolder.rowMeta('Parent Beta')).toHaveText('');
    });

    await test.step('Verify nothing is ticked yet and there is no footer', async () => {
      await expect(chooseFolder.rowCheckbox('Parent Alpha')).not.toBeChecked();
      await expect(chooseFolder.rowCheckbox('Parent Beta')).not.toBeChecked();
      await expect(chooseFolder.selectAll()).not.toBeChecked();
      await expect(chooseFolder.openSelectedButton()).toHaveCount(0);
    });
  });

  test('opens only the ticked collection from the list', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const { sidebar, toast } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'parent')]);

    await selectListedCollections(page, ['Parent Alpha']);

    await test.step('Verify the footer offers to open one collection', async () => {
      await expect(chooseFolder.openSelectedButton()).toHaveText('Open 1 collection');
      await expect(chooseFolder.cancelButton()).toBeVisible();
    });

    await test.step('Open the ticked collection', async () => {
      await chooseFolder.openSelectedButton().click();
    });

    await test.step('Verify only Parent Alpha opens', async () => {
      await expect(toast.byMessage('Collection added to workspace')).toBeVisible();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Parent Alpha')).toBeVisible();
      await expect(sidebar.collection('Parent Beta')).toHaveCount(0);
    });
  });

  test('ticks every listed collection with Select all and unticks them with it again', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const chooseFolder = buildChooseFolderLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'parent')]);

    await selectListedCollections(page, ['Parent Alpha']);

    await test.step('Verify Select all is partly ticked', async () => {
      await expect(chooseFolder.selectAll()).not.toBeChecked();
      await expect(chooseFolder.selectAll()).toHaveJSProperty('indeterminate', true);
    });

    await test.step('Tick Select all', async () => {
      await chooseFolder.selectAll().check();
    });

    await test.step('Verify both collections are ticked', async () => {
      await expect(chooseFolder.rowCheckbox('Parent Alpha')).toBeChecked();
      await expect(chooseFolder.rowCheckbox('Parent Beta')).toBeChecked();
      await expect(chooseFolder.openSelectedButton()).toHaveText('Open 2 collections');
    });

    await test.step('Untick Select all', async () => {
      await chooseFolder.selectAll().uncheck();
    });

    await test.step('Verify nothing is ticked and the footer is gone', async () => {
      await expect(chooseFolder.rowCheckbox('Parent Alpha')).not.toBeChecked();
      await expect(chooseFolder.rowCheckbox('Parent Beta')).not.toBeChecked();
      await expect(chooseFolder.openSelectedButton()).toHaveCount(0);
    });
  });

  test('opens a single collection from the Open button on its row', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const { sidebar, toast } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'parent')]);

    await openListedCollection(page, 'Parent Beta');

    await test.step('Verify only Parent Beta opens', async () => {
      await expect(toast.byMessage('Collection added to workspace')).toBeVisible();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Parent Beta')).toBeVisible();
      await expect(sidebar.collection('Parent Alpha')).toHaveCount(0);
    });
  });

  test('filters the listed collections by the search text', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const chooseFolder = buildChooseFolderLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'parent')]);

    await test.step('Search for beta', async () => {
      await chooseFolder.searchInput().fill('beta');
    });

    await test.step('Verify only Parent Beta is listed', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Beta']);
    });

    await test.step('Search for gamma', async () => {
      await chooseFolder.searchInput().fill('gamma');
    });

    await test.step('Verify no collection matches', async () => {
      await expect(chooseFolder.noMatch()).toHaveText('No collection matches “gamma”');
      await expect(chooseFolder.rows()).toHaveCount(0);
    });

    await test.step('Clear the search', async () => {
      await chooseFolder.searchClear().click();
    });

    await test.step('Verify both collections are listed again', async () => {
      await expect(chooseFolder.searchInput()).toHaveValue('');
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });
  });

  test('hides an already open collection behind Show and offers to switch to it', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const chooseFolder = buildChooseFolderLocators(page);
    const parentFolder = path.join(collectionFixturePath!, 'parent');

    await openCollectionFromDialog(page, electronApp, path.join(parentFolder, 'alpha'));

    await chooseFolders(page, electronApp, [parentFolder]);

    await test.step('Verify Parent Alpha is hidden behind Show', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Beta']);
      await expect(chooseFolder.openLine()).toHaveText('1 collection already open in this workspace isn’t shown. Show');
    });

    await test.step('Click Show', async () => {
      await chooseFolder.openToggle().click();
    });

    await test.step('Verify Parent Alpha is listed in path order with Switch and no checkbox', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
      await expect(chooseFolder.rowSwitchButton('Parent Alpha')).toHaveText('Switch');
      await expect(chooseFolder.rowCheckbox('Parent Alpha')).toHaveCount(0);
    });

    await test.step('Tick Select all', async () => {
      await chooseFolder.selectAll().check();
    });

    await test.step('Verify only the collection that can be opened is ticked', async () => {
      await expect(chooseFolder.rowCheckbox('Parent Beta')).toBeChecked();
      await expect(chooseFolder.openSelectedButton()).toHaveText('Open 1 collection');
    });
  });

  test('switches to an open collection when its folder is picked again', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const { tabs, toast } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const singleFolder = path.join(collectionFixturePath!, 'single');

    await openCollectionFromDialog(page, electronApp, singleFolder);

    await test.step('Verify no collection settings tab is open yet', async () => {
      await expect(tabs.collectionSettingsTab()).toHaveCount(0);
    });

    await chooseFolders(page, electronApp, [singleFolder]);

    await test.step('Verify the modal closes on the collection settings', async () => {
      await expect(toast.byMessage('Single Collection is already open')).toBeVisible();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(tabs.collectionSettingsTab()).toBeVisible();
      await expect(tabs.activeRequestTab()).toContainText('Collection');
    });
  });

  test('closes without opening anything when every picked collection is already open', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const { sidebar, toast } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const pickedFolders = [path.join(collectionFixturePath!, 'direct-one'), path.join(collectionFixturePath!, 'direct-two')];

    await openCollectionFromDialog(page, electronApp, pickedFolders);

    await chooseFolders(page, electronApp, pickedFolders);

    await test.step('Verify the modal closes and nothing opens twice', async () => {
      await expect(toast.byMessage('Those collections are already open')).toBeVisible();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Direct One')).toHaveCount(1);
      await expect(sidebar.collection('Direct Two')).toHaveCount(1);
    });
  });

  test('skips a picked folder that is not a collection and opens the rest', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const { sidebar, toast } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await chooseFolders(page, electronApp, [
      path.join(collectionFixturePath!, 'single'),
      path.join(collectionFixturePath!, 'not-a-collection')
    ]);

    await test.step('Verify the folder is skipped and the collection opens', async () => {
      await expect(toast.byMessage('not-a-collection isn’t a collection, so it was skipped.')).toBeVisible();
      await expect(toast.byMessage('Collection added to workspace')).toBeVisible();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Single Collection')).toBeVisible();
    });
  });

  test('pre-ticks picked collection folders when the other picked folders hold more collections', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);

    await chooseFolders(page, electronApp, [
      path.join(collectionFixturePath!, 'single'),
      path.join(collectionFixturePath!, 'parent')
    ]);

    await test.step('Verify the note counts every collection found', async () => {
      await expect(openCollectionModal.note()).toContainText('Found 3 collections in the folders you picked. Pick the ones to open.');
    });

    await test.step('Verify only the picked collection folder is ticked', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta', 'Single Collection']);
      await expect(chooseFolder.rowCheckbox('Single Collection')).toBeChecked();
      await expect(chooseFolder.rowCheckbox('Parent Alpha')).not.toBeChecked();
      await expect(chooseFolder.rowCheckbox('Parent Beta')).not.toBeChecked();
      await expect(chooseFolder.openSelectedButton()).toHaveText('Open 1 collection');
    });
  });

  test('explains why a picked folder without collections does not open', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'not-a-collection')]);

    await test.step('Verify the note explains what a collection folder needs', async () => {
      await expect(openCollectionModal.note()).toContainText('not-a-collection isn’t a Bruno collection. A collection folder has a bruno.json or opencollection.yml at its top level.');
      await expect(openCollectionModal.noteActionButton()).toHaveCount(0);
      await expect(chooseFolder.dropZone()).toBeVisible();
    });

    await test.step('Dismiss the note', async () => {
      await openCollectionModal.noteDismissButton().click();
    });

    await test.step('Verify the note is gone', async () => {
      await expect(openCollectionModal.note()).toHaveCount(0);
      await expect(chooseFolder.dropZone()).toBeVisible();
    });
  });

  test('offers to import an export file found in a picked folder', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'postman-only')]);

    await test.step('Verify the note names the export file', async () => {
      await expect(openCollectionModal.note()).toContainText('postman-only isn’t a collection, but it has a Postman export in it (export.postman_collection.json). That needs importing, not opening.');
      await expect(openCollectionModal.noteActionButton()).toHaveText('Import it');
    });

    await test.step('Click Import it', async () => {
      await openCollectionModal.noteActionButton().click();
    });

    await test.step('Verify the export is ready to import', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(importLocators.locationModal()).toBeVisible();
      await expect(importLocators.locationModal()).toContainText('Postman Only Export');
    });
  });

  test('replaces the list with the folders picked from the Choose folder shortcut', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);
    const parentFolder = path.join(collectionFixturePath!, 'parent');

    await chooseFolders(page, electronApp, [parentFolder]);

    await test.step('Verify the parent folder is listed', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });

    await test.step('Make the folder picker pick the nested folder', async () => {
      await mockBrowseFiles(electronApp, [path.join(parentFolder, 'nested')]);
    });

    await pressOpenCollectionShortcut(page, 'choose-folder');

    await test.step('Verify the new pick replaces the list', async () => {
      await expect(openCollectionModal.note()).toContainText('nested isn’t a collection itself, but it has 1 collection inside. Pick the ones to open.');
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Beta']);
    });
  });

  test('keeps the list and what was ticked when you leave Choose folder and come back', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'parent')]);

    await test.step('Verify the parent folder is listed', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });

    await selectListedCollections(page, ['Parent Alpha']);

    await test.step('Go to Import and back to Choose folder', async () => {
      await showOpenCollectionModal(page, 'import');
      await showOpenCollectionModal(page, 'choose-folder');
    });

    await test.step('Verify the list is still there with Parent Alpha ticked, without the note', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
      await expect(chooseFolder.rowCheckbox('Parent Alpha')).toBeChecked();
      await expect(openCollectionModal.note()).toHaveCount(0);
    });
  });

  test('closes the modal without opening anything from Cancel', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'parent')]);

    await selectListedCollections(page, ['Parent Alpha']);

    await test.step('Click Cancel', async () => {
      await chooseFolder.cancelButton().click();
    });

    await test.step('Verify the modal closes and nothing opens', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Parent Alpha')).toHaveCount(0);
      await expect(sidebar.collection('Parent Beta')).toHaveCount(0);
    });
  });
});
