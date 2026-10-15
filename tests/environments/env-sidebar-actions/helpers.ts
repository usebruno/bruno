import { test, Page, ElectronApplication } from '../../../playwright';
import { openCollectionFromDialog, openEnvironmentConfigTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

export const COLLECTION_NAME = 'Env Sidebar Actions';

// Listed in this order by the sidebar, which Shift-click ranges rely on.
export const ENV_NAMES = ['Env 1', 'Env 2', 'Env 3', 'Env 4'];

// Ctrl on Windows/Linux, Cmd on macOS (matches the app's platform check).
export const SELECT_MODIFIER: 'Meta' | 'Control' = process.platform === 'darwin' ? 'Meta' : 'Control';

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
export const ctrlClickRows = async (page: Page, names: string[]) => {
  const { environment } = buildCommonLocators(page);

  await test.step(`Cmd/Ctrl-click ${names.join(', ')}`, async () => {
    for (const name of names) {
      await environment.sidebarListItemExact('collection', name).click({ modifiers: [SELECT_MODIFIER] });
    }
  });
};

export const openRowContextMenu = async (page: Page, name: string) => {
  const { environment } = buildCommonLocators(page);

  await test.step(`Right-click "${name}"`, async () => {
    await environment.sidebarListItemExact('collection', name).click({ button: 'right' });
    await environment.sidebarActions.contextMenu().waitFor({ state: 'visible' });
  });
};
