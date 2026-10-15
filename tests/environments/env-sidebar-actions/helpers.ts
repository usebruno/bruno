import { test, Page, ElectronApplication } from '../../../playwright';
import { openCollectionFromDialog, openEnvironmentConfigTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  EnvironmentScope,
  createEnvironmentFromSidebar,
  openWorkspaceEnvironmentsTab
} from '../../utils/page/environments';

const COLLECTION_NAME = 'Env Sidebar Actions';

// Listed in this order by the sidebar, which Shift-click ranges rely on.
export const ENV_NAMES = ['Env 1', 'Env 2', 'Env 3', 'Env 4'];

// Ctrl on Windows/Linux, Cmd on macOS.
export const IS_MAC = process.platform === 'darwin';
export const SELECT_MODIFIER: 'Meta' | 'Control' = IS_MAC ? 'Meta' : 'Control';

export const SELECT_ALL_KEY = `${SELECT_MODIFIER}+KeyA`;
// macOS has no Delete key: Cmd+Backspace. Windows/Linux use the plain Delete key.
export const DELETE_KEY = IS_MAC ? 'Meta+Backspace' : 'Delete';

/**
 * Open a copy of the fixture collection and show its environments list.
 * @param collectionPath - Absolute path to the collection copy (the `collectionFixturePath` fixture)
 */
export const openEnvironmentsList = async (page: Page, electronApp: ElectronApplication, collectionPath: string) => {
  await test.step(`Open the environments list of "${COLLECTION_NAME}"`, async () => {
    const { sidebar, environment } = buildCommonLocators(page);

    await openCollectionFromDialog(page, electronApp, collectionPath);
    await sidebar.collection(COLLECTION_NAME).waitFor({ state: 'visible', timeout: 30000 });
    await sidebar.collection(COLLECTION_NAME).click();
    await openEnvironmentConfigTab(page);

    await environment.sidebarActions.rows().first().waitFor({ state: 'visible' });
  });
};

/**
 * Cmd/Ctrl-click each row in turn. The first click also selects the environment that is open in the editor.
 */
export const ctrlClickRows = async (page: Page, names: string[], scope: EnvironmentScope = 'collection') => {
  const { environment } = buildCommonLocators(page);

  await test.step(`Cmd/Ctrl-click ${names.join(', ')}`, async () => {
    for (const name of names) {
      await environment.sidebarListItemExact(scope, name).click({ modifiers: [SELECT_MODIFIER] });
    }
  });
};

// click in the empty space below the rows to clear the selection, or to select all
export const clickEmptyListSpace = async (page: Page, scope: EnvironmentScope = 'collection') => {
  const { environment } = buildCommonLocators(page);
  const sidebarActions = scope === 'global' ? environment.workspaceSidebarActions : environment.sidebarActions;

  await test.step('Click the empty space below the rows', async () => {
    const sectionBody = sidebarActions.sectionBody();
    const box = await sectionBody.boundingBox();
    const lastRowBox = await sidebarActions.rows().last().boundingBox();
    if (!box || !lastRowBox) throw new Error('The environments section body or its rows are not visible');

    // Click just below the last row.
    const y = lastRowBox.y + lastRowBox.height - box.y + 8;
    if (y > box.height - 4) {
      throw new Error('There is no empty space below the rows to click, the section body is full');
    }

    await sectionBody.click({ position: { x: box.width / 2, y } });
  });
};

export const openRowContextMenu = async (page: Page, name: string, scope: EnvironmentScope = 'collection') => {
  const { environment } = buildCommonLocators(page);
  const sidebarActions = scope === 'global' ? environment.workspaceSidebarActions : environment.sidebarActions;

  await test.step(`Right-click "${name}"`, async () => {
    await environment.sidebarListItemExact(scope, name).click({ button: 'right' });
    await sidebarActions.contextMenu().waitFor({ state: 'visible' });
  });
};

/**
 * Delete every workspace (global) environment from the open workspace Environments tab.
 * Workspace environments persist across tests, so this keeps them isolated.
 */
export const deleteAllWorkspaceEnvironments = async (page: Page) => {
  await test.step('Delete all workspace environments', async () => {
    const { rows, emptyState, deleteModal } = buildCommonLocators(page).environment.workspaceSidebarActions;

    // Close anything a failed test left open (modal, menu, rename input)
    await page.keyboard.press('Escape');

    // Wait for the list to settle (a row or the empty state), so a list that is still rendering isn't read as empty.
    await rows().first().or(emptyState()).waitFor({ state: 'visible' });
    if ((await rows().count()) === 0) return;

    // A plain click focuses the list and clears any selection, so select all selects every row
    await rows().first().click();
    await page.keyboard.press(SELECT_ALL_KEY);
    await page.keyboard.press(DELETE_KEY);
    await deleteModal.confirm().click();
    await deleteModal.root().waitFor({ state: 'hidden' });
    await rows().first().waitFor({ state: 'detached' });
  });
};

/**
 * Open the workspace Environments tab with ENV_NAMES created as workspace (global) environments,
 * and the first one open in the editor.
 */
export const openWorkspaceEnvironments = async (page: Page) => {
  await test.step('Open the workspace environments with four environments', async () => {
    await openWorkspaceEnvironmentsTab(page);
    await deleteAllWorkspaceEnvironments(page);

    for (const name of ENV_NAMES) {
      await createEnvironmentFromSidebar(page, name, 'global');
    }

    // Creating an environment opens it, so the last one created is open now.
    await buildCommonLocators(page).environment.sidebarListItemExact('global', ENV_NAMES[0]).click();
  });
};
