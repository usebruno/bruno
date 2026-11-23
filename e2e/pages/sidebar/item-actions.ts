import {
  test,
  expect,
  Page,
  ElectronApplication
} from '../../playwright';
import { collectionSlug } from '../../../packages/bruno-app/src/utils/collections/collectionSlug';
import { EmptyStateRequestType, buildSidebarLocators } from './collection-tree';
import { buildModalLocators } from '../shared-ui/modal';
import { buildDropdownLocators } from '../shared-ui/dropdown';
import { buildToastLocators } from '../app-shell/toast';

/**
 * Locators for the actions (three-dot) menus on collection and item rows.
 */
export const buildItemActionLocators = (page: Page) => ({
  collectionActions: (collectionName: string) =>
    page.getByTestId('collections').locator('.collection-name')
      .filter({ hasText: collectionName })
      .locator('.collection-actions .icon'),
  collectionItemActions: (itemName: string) =>
    page.locator('.collection-item-name')
      .filter({ hasText: itemName })
      .locator('.menu-icon')
});

/**
 * Locators for the New Request dialog opened from a row's actions menu.
 */
export const buildNewRequestModalLocators = (page: Page) => ({
  requestNameInput: () => page.getByPlaceholder('Request Name')
});

const buildLocators = (page: Page) => ({
  sidebar: buildSidebarLocators(page),
  actions: buildItemActionLocators(page),
  request: buildNewRequestModalLocators(page),
  toast: buildToastLocators(page),
  dropdown: buildDropdownLocators(page),
  modal: buildModalLocators(page)
});

/**
 * Create a request from the "+ Add request" CTA shown inside an empty collection.
 * @param page - The page object
 * @param collectionName - The name of the collection
 * @param requestType - The request type to pick from the CTA menu (defaults to http)
 * @returns void
 */
export const createRequestFromEmptyStateCta = async (
  page: Page,
  collectionName: string,
  requestType: EmptyStateRequestType = 'http'
) => {
  await test.step(`Create a ${requestType} request from the "+ Add request" CTA`, async () => {
    const { sidebar } = buildLocators(page);

    await sidebar.collection(collectionName).click();
    await sidebar.emptyStateCta(collectionName).click();
    await sidebar.emptyStateCtaItem(requestType).click();
  });
};

/**
 * Delete a request from a collection
 * @param page - The page object
 * @param requestName - The name of the request to delete
 * @param collectionName - The name of the collection
 * @returns void
 */
export const deleteRequest = async (page, requestName: string, collectionName: string) => {
  await test.step(`Delete request "${requestName}" from collection "${collectionName}"`, async () => {
    const locators = buildLocators(page);

    // Click on the collection first to open it if it's closed
    await locators.sidebar.collection(collectionName).click();

    const request = page
      .locator(`[data-collection-id="${collectionSlug(collectionName)}"]`)
      .locator('.collection-item-name')
      .filter({ hasText: requestName });

    await request.hover();
    await request.locator('.menu-icon').click();
    await locators.dropdown.item('Delete').click();
    await locators.modal.button('Delete').click();
    await expect(request).not.toBeVisible();
  });
};

/**
 * Rename a request or folder from the sidebar, via its row's "..." menu -> Rename.
 * Waits for the rename modal to close and the renamed row to appear.
 * @param page - The page object
 * @param currentName - The item's current name in the sidebar
 * @param newName - The name to rename it to
 * @param options - `type` selects the row and modal variant; defaults to 'request'
 * @returns void
 */
export const renameCollectionItem = async (
  page: Page,
  currentName: string,
  newName: string,
  { type = 'request' }: { type?: 'request' | 'folder' } = {}
) => {
  await test.step(`Rename ${type} "${currentName}" to "${newName}"`, async () => {
    const locators = buildLocators(page);
    await locators.sidebar.item(currentName).hover();
    await locators.actions.collectionItemActions(currentName).click();
    await locators.dropdown.item('Rename').click();
    const modal = locators.modal.byTitle(type === 'folder' ? 'Rename Folder' : 'Rename Request');
    await modal.waitFor({ state: 'visible' });
    await locators.modal.itemNameInput(modal).fill(newName);
    await modal.getByTestId('rename-item-button').click();
    await modal.waitFor({ state: 'hidden' });

    await locators.sidebar.item(newName).waitFor({ state: 'visible', timeout: 10000 });
  });
};

/**
 * Create a folder inside a collection or another folder
 * @param page - The page object
 * @param folderName - The name of the folder to create
 * @param parentName - The name of the parent collection or folder
 * @param isCollection - Whether the parent is a collection (true) or folder (false)
 * @returns void
 */
export const createFolder = async (
  page: Page,
  folderName: string,
  parentName: string,
  isCollection: boolean = true
) => {
  await test.step(`Create folder "${folderName}" in "${parentName}"`, async () => {
    const locators = buildLocators(page);

    if (isCollection) {
      await locators.sidebar.collection(parentName).hover();
      await locators.actions.collectionActions(parentName).click();
    } else {
      await locators.sidebar.folder(parentName).hover();
      await locators.actions.collectionItemActions(parentName).click();
    }

    await locators.dropdown.item('New Folder').click();
    await page.getByTestId('new-folder-input').fill(folderName);
    await locators.modal.button('Create').click();

    // Scope to the parent so same-named folders in other collections don't trip strict mode.
    const parentScope = isCollection
      ? locators.sidebar.collectionScope(parentName)
      : locators.sidebar.folderScope(parentName);
    await expect(parentScope.locator('.collection-item-name').filter({ hasText: folderName })).toBeVisible();
  });
};

export const openItemActionsMenu = async (page: Page, name: string) => {
  const { sidebar } = buildLocators(page);
  const menu = sidebar.rowMenu(name);
  await sidebar.itemRow(name).first().hover();
  await menu.trigger().first().click({ force: true });
};

const openCollectionActionsMenu = async (page: Page, collectionName: string) => {
  const { sidebar } = buildLocators(page);
  const menu = sidebar.rowMenu(collectionName, 'collection');
  await sidebar.collectionRow(collectionName).hover();
  const trigger = menu.trigger();
  await trigger.waitFor({ state: 'visible' });
  await trigger.click();
};

export const cloneItem = async (page: Page, name: string) => {
  await test.step(`Clone item "${name}"`, async () => {
    const { dropdown, toast } = buildLocators(page);
    await openItemActionsMenu(page, name);
    await dropdown.item('Clone').click();
    // Synchronize on completion (a "… cloned!" toast). `.first()` so a still-visible
    // toast from a prior clone is not the one we wait on.
    await toast.byMessage(/cloned!/).first().waitFor({ state: 'visible' });
  });
};

export const copyItem = async (page: Page, name: string) => {
  await test.step(`Copy item "${name}"`, async () => {
    const { dropdown, toast } = buildLocators(page);
    await openItemActionsMenu(page, name);
    await dropdown.item('Copy').click();
    await toast.byMessage(/copied/).first().waitFor({ state: 'visible' });
  });
};

export const pasteIntoCollection = async (page: Page, collectionName: string) => {
  await test.step(`Paste into collection "${collectionName}"`, async () => {
    const { dropdown, toast } = buildLocators(page);
    await openCollectionActionsMenu(page, collectionName);
    await dropdown.item('Paste').click();
    await toast.byMessage('Item pasted successfully').first().waitFor({ state: 'visible' });
  });
};

export const pasteIntoFolder = async (page: Page, folderName: string) => {
  await test.step(`Paste into folder "${folderName}"`, async () => {
    const { dropdown, toast } = buildLocators(page);
    await openItemActionsMenu(page, folderName);
    await dropdown.item('Paste').click();
    await toast.byMessage('Item pasted successfully').first().waitFor({ state: 'visible' });
  });
};

type ItemType = 'request' | 'folder';

const renameModalTitle = (type: ItemType) => (type === 'folder' ? 'Rename Folder' : 'Rename Request');

export const openRenameModal = async (page: Page, name: string, type: ItemType = 'request') => {
  const { dropdown, modal } = buildLocators(page);
  await openItemActionsMenu(page, name);
  await dropdown.item('Rename').click();
  await modal.byTitle(renameModalTitle(type)).waitFor({ state: 'visible' });
};

export const renameItemTo = async (page: Page, name: string, newName: string, type: ItemType = 'request') => {
  await test.step(`Rename "${name}" to "${newName}"`, async () => {
    const { modal, sidebar } = buildLocators(page);
    await openRenameModal(page, name, type);
    await sidebar.renameItemModal.nameInput().fill(newName);
    await sidebar.renameItemModal.submit().click();
    await modal.byTitle(renameModalTitle(type)).waitFor({ state: 'hidden' });
  });
};

export const revealFilesystemName = async (page: Page) => {
  const { sidebar } = buildLocators(page);
  await sidebar.filesystemName.optionsButton().first().click();
  await sidebar.filesystemName.showFilesystemNameItem().click();
};

export const renameViaFilename = async (page: Page, name: string, newFilename: string, type: ItemType = 'request') => {
  await test.step(`Rename filesystem name of "${name}" to "${newFilename}"`, async () => {
    const { modal, sidebar } = buildLocators(page);
    await openRenameModal(page, name, type);
    await revealFilesystemName(page);
    await sidebar.renameItemModal.filenameEditIcon().click();
    await sidebar.filesystemName.fileNameInput().fill(newFilename);
    await sidebar.renameItemModal.submit().click();
    await modal.byTitle(renameModalTitle(type)).waitFor({ state: 'hidden' });
  });
};

export const openNewRequestModal = async (page: Page, parentName: string, { inFolder = false } = {}) => {
  const { dropdown, request } = buildLocators(page);
  if (inFolder) {
    await openItemActionsMenu(page, parentName);
  } else {
    await openCollectionActionsMenu(page, parentName);
  }
  await dropdown.item('New Request').click();
  await request.requestNameInput().waitFor({ state: 'visible' });
};

export const createRequestViaModal = async (page: Page, parentName: string, name: string, { inFolder = false } = {}) => {
  await test.step(`Create request "${name}" via modal in "${parentName}"`, async () => {
    const { modal, request, sidebar } = buildLocators(page);
    await openNewRequestModal(page, parentName, { inFolder });
    await request.requestNameInput().fill(name);
    await sidebar.newRequestModal.createButton().click();
    await modal.any().waitFor({ state: 'hidden' });
  });
};

export const createRequestWithEditedFilename = async (
  page: Page,
  collectionName: string,
  displayName: string,
  filename: string
) => {
  await test.step(`Create request "${displayName}" with filename "${filename}"`, async () => {
    const { modal, request, sidebar } = buildLocators(page);
    await openNewRequestModal(page, collectionName);
    await request.requestNameInput().fill(displayName);
    await revealFilesystemName(page);
    await sidebar.newRequestModal.filenameEditIcon().click();
    await sidebar.filesystemName.fileNameInput().fill(filename);
    await sidebar.newRequestModal.createButton().click();
    await modal.any().waitFor({ state: 'hidden' });
  });
};

export const openNewFolderModal = async (page: Page, collectionName: string) => {
  const { dropdown, sidebar } = buildLocators(page);
  await openCollectionActionsMenu(page, collectionName);
  await dropdown.item('New Folder').click();
  await sidebar.newFolderModal.nameInput().waitFor({ state: 'visible' });
};

export const createFolderViaModal = async (page: Page, collectionName: string, folderName: string) => {
  await test.step(`Create folder "${folderName}" via modal in "${collectionName}"`, async () => {
    const { modal, sidebar } = buildLocators(page);
    await openNewFolderModal(page, collectionName);
    await sidebar.newFolderModal.nameInput().fill(folderName);
    await modal.button('Create').click();
    await modal.any().waitFor({ state: 'hidden' });
  });
};

export const openCloneCollectionModal = async (page: Page, collectionName: string) => {
  const { dropdown, modal } = buildLocators(page);
  await openCollectionActionsMenu(page, collectionName);
  await dropdown.item('Clone').click();
  await modal.byTitle('Clone Collection').waitFor({ state: 'visible' });
};

export const chooseCloneLocation = async (page: Page, electronApp: ElectronApplication, location: string) => {
  const { sidebar } = buildLocators(page);
  await electronApp.evaluate(({ dialog }: { dialog: Electron.Dialog }, dir: string) => {
    (globalThis as any).__bruPrevShowOpenDialog = dialog.showOpenDialog;
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
  }, location);
  try {
    await sidebar.cloneCollectionModal.browseButton().click();
    await sidebar.cloneCollectionModal.locationInput().waitFor({ state: 'visible' });
  } finally {
    await electronApp.evaluate(({ dialog }: { dialog: Electron.Dialog }) => {
      if ((globalThis as any).__bruPrevShowOpenDialog) {
        dialog.showOpenDialog = (globalThis as any).__bruPrevShowOpenDialog;
        delete (globalThis as any).__bruPrevShowOpenDialog;
      }
    });
  }
};
