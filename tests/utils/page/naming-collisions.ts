import process from 'node:process';
import { ElectronApplication } from '@playwright/test';
import { test, Page, Locator } from '../../../playwright';
import { buildCommonLocators } from './locators';

export const buildNamingCollisionLocators = (page: Page) => ({

  toast: (text: string | RegExp): Locator =>
    page.locator('.toast-container').getByText(text),

  // Inline Yup form-validation error rendered inside a modal.
  formError: (text: string | RegExp): Locator =>
    page.locator('.bruno-modal [data-testid="form-error"]').getByText(text),

  anyModal: (): Locator => page.locator('.bruno-modal'),
  modalByTitle: (title: string): Locator => buildCommonLocators(page).modal.byTitle(title),
  modalCardByTitle: (title: string): Locator => buildCommonLocators(page).modal.card().filter({ hasText: title }),

  requestNameInput: (): Locator => buildCommonLocators(page).request.requestNameInput(),
  createRequestButton: (): Locator => page.getByTestId('create-new-request-button'),

  renameNameInput: (): Locator => page.locator('#collection-item-name'),
  renameSubmit: (): Locator => page.getByTestId('rename-item-button'),
  renameEditIcon: (): Locator => page.getByTestId('rename-request-edit-icon'),
  // Same control in the New Request modal (different component, separate testid).
  filenameEditIcon: (): Locator => page.getByTestId('filename-edit-icon'),

  // Filesystem-name section (shared by New Request / Rename / New Folder)
  optionsButton: (): Locator => page.locator('.btn-advanced'),
  showFilesystemNameItem: (): Locator => page.locator('.dropdown-item').filter({ hasText: 'Show Filesystem Name' }),
  fileNameInput: (): Locator => page.locator('#file-name'),

  newFolderInput: (): Locator => page.getByTestId('new-folder-input'),

  // Clone Collection modal
  collectionNameInput: (): Locator => page.locator('#collection-name'),
  collectionLocationInput: (): Locator => page.locator('#collection-location'),
  browseButton: (): Locator => page.getByText('Browse', { exact: true }),

  // Save Request (transient) modal
  saveRequestModal: (): Locator => page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' }),
  saveRequestNameInput: (): Locator => page.locator('#request-name'),

  // Request body editor (used to set/inspect a request body)
  bodyModeSelector: (): Locator => buildCommonLocators(page).request.bodyModeSelector(),
  bodyEditor: (): Locator => buildCommonLocators(page).request.bodyEditor().locator('.CodeMirror').first()
});

export const openItemActionsMenu = async (page: Page, name: string) => {
  const { sidebar } = buildCommonLocators(page);
  const menu = sidebar.rowMenu(name);
  await sidebar.itemRow(name).first().hover();
  await menu.trigger().first().click({ force: true });
};
const openCollectionActionsMenu = async (page: Page, collectionName: string) => {
  const { sidebar } = buildCommonLocators(page);
  const menu = sidebar.rowMenu(collectionName, 'collection');
  await sidebar.collectionRow(collectionName).hover();
  const trigger = menu.trigger();
  await trigger.waitFor({ state: 'visible' });
  await trigger.click();
};

export const cloneItem = async (page: Page, name: string) => {
  await test.step(`Clone item "${name}"`, async () => {
    const { dropdown } = buildCommonLocators(page);
    const { toast } = buildNamingCollisionLocators(page);
    await openItemActionsMenu(page, name);
    await dropdown.item('Clone').click();
    // Synchronize on completion (a "… cloned!" toast), scoped to the toast
    // container so a still-visible toast from a prior clone is not matched.
    await toast(/cloned!/).first().waitFor({ state: 'visible' });
  });
};

export const copyItem = async (page: Page, name: string) => {
  await test.step(`Copy item "${name}"`, async () => {
    const { dropdown } = buildCommonLocators(page);
    const { toast } = buildNamingCollisionLocators(page);
    await openItemActionsMenu(page, name);
    await dropdown.item('Copy').click();
    await toast(/copied/).first().waitFor({ state: 'visible' });
  });
};

export const pasteIntoCollection = async (page: Page, collectionName: string) => {
  await test.step(`Paste into collection "${collectionName}"`, async () => {
    const { dropdown } = buildCommonLocators(page);
    const { toast } = buildNamingCollisionLocators(page);
    await openCollectionActionsMenu(page, collectionName);
    await dropdown.item('Paste').click();
    await toast('Item pasted successfully').first().waitFor({ state: 'visible' });
  });
};

export const pasteIntoFolder = async (page: Page, folderName: string) => {
  await test.step(`Paste into folder "${folderName}"`, async () => {
    const { dropdown } = buildCommonLocators(page);
    const { toast } = buildNamingCollisionLocators(page);
    await openItemActionsMenu(page, folderName);
    await dropdown.item('Paste').click();
    await toast('Item pasted successfully').first().waitFor({ state: 'visible' });
  });
};

type ItemType = 'request' | 'folder';
const renameModalTitle = (type: ItemType) => (type === 'folder' ? 'Rename Folder' : 'Rename Request');

export const openRenameModal = async (page: Page, name: string, type: ItemType = 'request') => {
  const { dropdown } = buildCommonLocators(page);
  const locators = buildNamingCollisionLocators(page);
  await openItemActionsMenu(page, name);
  await dropdown.item('Rename').click();
  await locators.modalByTitle(renameModalTitle(type)).waitFor({ state: 'visible' });
};

export const renameItemTo = async (page: Page, name: string, newName: string, type: ItemType = 'request') => {
  await test.step(`Rename "${name}" to "${newName}"`, async () => {
    const locators = buildNamingCollisionLocators(page);
    await openRenameModal(page, name, type);
    await locators.renameNameInput().fill(newName);
    await locators.renameSubmit().click();
    await locators.modalByTitle(renameModalTitle(type)).waitFor({ state: 'hidden' });
  });
};

export const revealFilesystemName = async (page: Page) => {
  const locators = buildNamingCollisionLocators(page);
  await locators.optionsButton().first().click();
  await locators.showFilesystemNameItem().click();
};

export const renameViaFilename = async (page: Page, name: string, newFilename: string, type: ItemType = 'request') => {
  await test.step(`Rename filesystem name of "${name}" to "${newFilename}"`, async () => {
    const locators = buildNamingCollisionLocators(page);
    await openRenameModal(page, name, type);
    await revealFilesystemName(page);
    await locators.renameEditIcon().click();
    await locators.fileNameInput().fill(newFilename);
    await locators.renameSubmit().click();
    await locators.modalByTitle(renameModalTitle(type)).waitFor({ state: 'hidden' });
  });
};

export const openNewRequestModal = async (page: Page, parentName: string, { inFolder = false } = {}) => {
  const { dropdown } = buildCommonLocators(page);
  if (inFolder) {
    await openItemActionsMenu(page, parentName);
  } else {
    await openCollectionActionsMenu(page, parentName);
  }
  await dropdown.item('New Request').click();
  await buildNamingCollisionLocators(page).requestNameInput().waitFor({ state: 'visible' });
};

export const createRequestViaModal = async (page: Page, parentName: string, name: string, { inFolder = false } = {}) => {
  await test.step(`Create request "${name}" via modal in "${parentName}"`, async () => {
    const locators = buildNamingCollisionLocators(page);
    await openNewRequestModal(page, parentName, { inFolder });
    await locators.requestNameInput().fill(name);
    await locators.createRequestButton().click();
    await locators.anyModal().waitFor({ state: 'hidden' });
  });
};

export const createRequestWithEditedFilename = async (
  page: Page,
  collectionName: string,
  displayName: string,
  filename: string
) => {
  await test.step(`Create request "${displayName}" with filename "${filename}"`, async () => {
    const locators = buildNamingCollisionLocators(page);
    await openNewRequestModal(page, collectionName);
    await locators.requestNameInput().fill(displayName);
    await revealFilesystemName(page);
    await locators.filenameEditIcon().click();
    await locators.fileNameInput().fill(filename);
    await locators.createRequestButton().click();
    await locators.anyModal().waitFor({ state: 'hidden' });
  });
};

export const openNewFolderModal = async (page: Page, collectionName: string) => {
  const { dropdown } = buildCommonLocators(page);
  await openCollectionActionsMenu(page, collectionName);
  await dropdown.item('New Folder').click();
  await buildNamingCollisionLocators(page).newFolderInput().waitFor({ state: 'visible' });
};

export const createFolderViaModal = async (page: Page, collectionName: string, folderName: string) => {
  await test.step(`Create folder "${folderName}" via modal in "${collectionName}"`, async () => {
    const { modal } = buildCommonLocators(page);
    const locators = buildNamingCollisionLocators(page);
    await openNewFolderModal(page, collectionName);
    await locators.newFolderInput().fill(folderName);
    await modal.button('Create').click();
    await locators.anyModal().waitFor({ state: 'hidden' });
  });
};

export const openCloneCollectionModal = async (page: Page, collectionName: string) => {
  const { dropdown } = buildCommonLocators(page);
  await openCollectionActionsMenu(page, collectionName);
  await dropdown.item('Clone').click();
  await buildNamingCollisionLocators(page).modalByTitle('Clone Collection').waitFor({ state: 'visible' });
};

export const chooseCloneLocation = async (page: Page, electronApp: ElectronApplication, location: string) => {
  const locators = buildNamingCollisionLocators(page);
  await electronApp.evaluate(({ dialog }: { dialog: Electron.Dialog }, dir: string) => {
    (globalThis as any).__bruPrevShowOpenDialog = dialog.showOpenDialog;
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
  }, location);
  try {
    await locators.browseButton().click();
    await locators.collectionLocationInput().waitFor({ state: 'visible' });
  } finally {
    await electronApp.evaluate(({ dialog }: { dialog: Electron.Dialog }) => {
      if ((globalThis as any).__bruPrevShowOpenDialog) {
        dialog.showOpenDialog = (globalThis as any).__bruPrevShowOpenDialog;
        delete (globalThis as any).__bruPrevShowOpenDialog;
      }
    });
  }
};

export const setTextBody = async (page: Page, value: string) => {
  const locators = buildNamingCollisionLocators(page);
  await locators.bodyModeSelector().click();
  await page.locator('.dropdown-item').filter({ hasText: 'Text' }).click();
  await locators.bodyEditor().click();
  await page.keyboard.type(value);
};

// Save the active transient (untitled) request via the Save modal, giving it a
// display name. Waits for the modal to open and close; assertions stay in the spec.
export const saveTransientRequestAs = async (page: Page, name: string) => {
  await test.step(`Save transient request as "${name}"`, async () => {
    const nc = buildNamingCollisionLocators(page);
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    const modal = nc.saveRequestModal();

    await page.keyboard.press(`${modifier}+s`);
    await modal.waitFor({ state: 'visible' });
    await nc.saveRequestNameInput().clear();
    await nc.saveRequestNameInput().fill(name);
    await modal.getByRole('button', { name: 'Save' }).click();
    await modal.waitFor({ state: 'hidden' });
  });
};
