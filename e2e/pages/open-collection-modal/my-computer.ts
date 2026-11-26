import * as path from 'path';
import { test, Page, ElectronApplication } from '../../playwright';
import { mockBrowseFiles } from '../request/body';
import { buildCollectionListLocators } from './collection-list';
import { buildOpenCollectionModalLocators, showOpenCollectionModal } from './shell';

const SCAN_TIMEOUT = 30000;
const BANNER_DISMISSED_KEY = 'bruno.openCollection.myComputerBannerDismissed';

export const buildMyComputerLocators = (page: Page) => {
  const emptyState = () => page.getByTestId('my-computer-empty');

  return {
    ...buildCollectionListLocators(page, 'my-computer'),
    scanStatus: () => page.getByTestId('my-computer-subtitle').getByRole('status'),
    manageButton: () => page.getByTestId('my-computer-manage'),
    rescanButton: () => page.getByTestId('my-computer-rescan'),
    banner: () => page.getByTestId('my-computer-banner'),
    bannerManageButton: () => page.getByTestId('my-computer-banner-manage'),
    bannerDismissButton: () => page.getByTestId('my-computer-banner-dismiss'),
    noMatchTitle: () => page.getByTestId('my-computer-no-match').getByRole('heading'),
    emptyState,
    emptyStateTitle: () => emptyState().getByRole('heading'),
    openFolderButton: () => page.getByTestId('my-computer-open-folder'),
    manageLocationsButton: () => page.getByTestId('my-computer-manage-locations'),
    importLink: () => page.getByTestId('my-computer-import')
  };
};

export const buildLocationsLocators = (page: Page) => {
  const rows = () => page.getByTestId('locations-row');
  const row = (folderPath: string) =>
    rows().filter({ has: page.getByTestId('locations-row-label').and(page.getByTitle(folderPath, { exact: true })) });

  return {
    rows,
    row,
    rowLabels: () => page.getByTestId('locations-row-label'),
    rowStatuses: () => page.getByTestId('locations-row-status'),
    rowStatus: (folderPath: string) => row(folderPath).getByTestId('locations-row-status'),
    rowRemoveButton: (folderPath: string) => row(folderPath).getByTestId('locations-row-remove'),
    removeButtons: () => page.getByTestId('locations-row-remove'),
    addFolderButton: () => page.getByTestId('locations-add-folder'),
    wholeComputerCheckbox: () => page.getByTestId('locations-search-whole-computer').getByRole('checkbox'),
    skipsInfoButton: () => page.getByTestId('locations-skips-info'),
    tooltip: () => page.getByRole('tooltip')
  };
};

const waitForScan = async (page: Page) => {
  await buildMyComputerLocators(page).scanStatus().filter({ hasText: /^Collections found in / }).waitFor({ timeout: SCAN_TIMEOUT });
};

export const showMyComputer = async (page: Page) => {
  await test.step('Show My computer and wait for its scan', async () => {
    await showOpenCollectionModal(page, 'my-computer');
    await waitForScan(page);
  });
};

export const rescanMyComputer = async (page: Page) => {
  await test.step('Rescan the My computer locations', async () => {
    await buildMyComputerLocators(page).rescanButton().click();
    await waitForScan(page);
  });
};

export const openMyComputerCollection = async (page: Page, name: string) => {
  await test.step(`Open "${name}" from its My computer row`, async () => {
    const myComputer = buildMyComputerLocators(page);
    await myComputer.row(name).hover();
    await myComputer.rowOpenButton(name).click({ force: true });
  });
};

export const switchToMyComputerCollection = async (page: Page, name: string) => {
  await test.step(`Switch to "${name}" from its My computer row`, async () => {
    const myComputer = buildMyComputerLocators(page);
    await myComputer.row(name).hover();
    await myComputer.rowSwitchButton(name).click({ force: true });
  });
};

export const selectMyComputerCollections = async (page: Page, names: string[]) => {
  await test.step(`Select "${names.join('", "')}" in My computer`, async () => {
    const myComputer = buildMyComputerLocators(page);
    for (const name of names) {
      await myComputer.row(name).click();
    }
  });
};

export const forgetMyComputerBannerDismissal = async (page: Page) => {
  await test.step('Forget that the My computer banner was dismissed', async () => {
    await page.evaluate((key) => localStorage.removeItem(key), BANNER_DISMISSED_KEY);
  });
};

export const showLocations = async (page: Page) => {
  await test.step('Show Locations from My computer', async () => {
    await showMyComputer(page);
    await buildMyComputerLocators(page).manageButton().click();
    await buildOpenCollectionModalLocators(page).pageView('locations').waitFor({ state: 'visible' });
  });
};

export const addSearchLocation = async (page: Page, electronApp: ElectronApplication, folderPath: string) => {
  await test.step(`Add "${path.basename(folderPath)}" as a search location`, async () => {
    const locations = buildLocationsLocators(page);
    await mockBrowseFiles(electronApp, [folderPath]);
    await locations.addFolderButton().click();
    await locations.rowStatus(folderPath).filter({ hasNotText: 'Scanning…' }).waitFor({ timeout: SCAN_TIMEOUT });
  });
};

export const removeSearchLocations = async (page: Page, folderPaths: string[]) => {
  await test.step(`Remove "${folderPaths.map((folderPath) => path.basename(folderPath)).join('", "')}" from the search locations`, async () => {
    const locations = buildLocationsLocators(page);
    await showLocations(page);
    for (const folderPath of folderPaths) {
      if (await locations.row(folderPath).isVisible()) {
        await locations.rowRemoveButton(folderPath).click();
        await locations.row(folderPath).waitFor({ state: 'detached', timeout: SCAN_TIMEOUT });
      }
    }
  });
};
