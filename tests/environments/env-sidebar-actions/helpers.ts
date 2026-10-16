import { test, Page, ElectronApplication } from '../../../playwright';
import { openCollectionFromDialog, openEnvironmentConfigTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  createEnvironmentFromSidebar,
  deleteAllWorkspaceEnvironments,
  openWorkspaceEnvironmentsTab
} from '../../utils/page/environments';

const COLLECTION_NAME = 'Env Sidebar Actions';

// Listed in this order by the sidebar, which Shift-click ranges rely on.
export const ENV_NAMES = ['Env 1', 'Env 2', 'Env 3', 'Env 4'];

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
