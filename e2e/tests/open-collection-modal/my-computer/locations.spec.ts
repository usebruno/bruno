import * as fs from 'fs';
import * as path from 'path';
import { test, expect, ElectronApplication } from '../../../playwright';
import { restoreDocumentsPath, stubDocumentsPath } from '../../../utils';
import { chooseFolders } from '../../../pages/open-collection-modal/choose-folder';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import {
  addSearchLocation,
  buildLocationsLocators,
  buildMyComputerLocators,
  removeSearchLocations,
  rescanMyComputer,
  showLocations,
  showMyComputer
} from '../../../pages/open-collection-modal/my-computer';

const SKIPS_TEXT = 'Bruno skips system and hidden folders, dependency caches, network drives and cloud folders like iCloud Drive, OneDrive and Dropbox.';

const readSavedSearchFolders = async (electronApp: ElectronApplication) => {
  const userDataPath = await electronApp.evaluate(({ app }) => app.getPath('userData'));
  const { preferences } = JSON.parse(await fs.promises.readFile(path.join(userDataPath, 'preferences.json'), 'utf-8'));
  return preferences.openCollection.searchFolders.map((folderPath: string) => path.resolve(folderPath));
};

test.describe('My computer locations', () => {
  test.describe.configure({ mode: 'default' });

  let electronApp: ElectronApplication;
  let searchA: string;
  let searchB: string;
  let searchC: string;
  let goneFolder: string;

  test.beforeAll(async ({ pageWithUserData, collectionFixturePath, reuseOrLaunchElectronApp }, testInfo) => {
    const fixtureRoot = collectionFixturePath!;
    searchA = path.join(fixtureRoot, 'search-a');
    searchB = path.join(fixtureRoot, 'search-b');
    searchC = path.join(fixtureRoot, 'search-c');
    goneFolder = path.join(fixtureRoot, 'search-gone');
    electronApp = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    await stubDocumentsPath(electronApp, path.join(fixtureRoot, 'documents'));
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeOpenCollectionModal(page);
  });

  test.afterAll(async () => {
    await restoreDocumentsPath(electronApp);
  });

  test('lists the default location, Documents/bruno, the workspace folders and the saved folders', async ({ pageWithUserData: page }) => {
    const locations = buildLocationsLocators(page);

    await showLocations(page);

    await test.step('Verify every location is listed in order with the number of collections found in it', async () => {
      await expect(locations.rowLabels()).toHaveText(['Default collection location', 'Documents/bruno', 'All open workspace folders', /search-a$/]);
      await expect(locations.rowStatuses()).toHaveText(['1 found', '1 found', '0 found', '2 found']);
    });
  });

  test('lets only the saved folders be removed', async ({ pageWithUserData: page }) => {
    const locations = buildLocationsLocators(page);

    await showLocations(page);

    await test.step('Verify only search-a has a remove button, named after its path', async () => {
      await expect(locations.removeButtons()).toHaveCount(1);
      await expect(locations.rowRemoveButton(searchA)).toHaveAccessibleName(`Stop looking in ${searchA}`);
    });
  });

  test('shows whole computer search switched off', async ({ pageWithUserData: page }) => {
    const locations = buildLocationsLocators(page);

    await showLocations(page);

    await test.step('Verify the whole computer switch is off', async () => {
      await expect(locations.wholeComputerCheckbox()).not.toBeChecked();
    });
  });

  test('explains in a tooltip which folders Bruno skips', async ({ pageWithUserData: page }) => {
    const locations = buildLocationsLocators(page);

    await showLocations(page);

    await test.step('Hover the info icon next to Search locations and verify the tooltip lists the folders Bruno skips', async () => {
      await expect(async () => {
        await page.mouse.move(0, 0);
        await locations.skipsInfoButton().hover();
        await expect(locations.tooltip()).toHaveText(SKIPS_TEXT, { timeout: 1000 });
      }).toPass({ timeout: 10000 });
    });
  });

  test.describe('changing the search locations', () => {
    test.afterEach(async ({ pageWithUserData: page }) => {
      await closeOpenCollectionModal(page);
      await removeSearchLocations(page, [searchB, searchC, goneFolder]);
    });

    test('adds a folder picked in the folder dialog', async ({ pageWithUserData: page }) => {
      const locations = buildLocationsLocators(page);
      const myComputer = buildMyComputerLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);

      await showLocations(page);

      await addSearchLocation(page, electronApp, searchB);

      await test.step('Verify search-b is listed last with the collection found in it', async () => {
        await expect(locations.rowLabels()).toHaveText(['Default collection location', 'Documents/bruno', 'All open workspace folders', /search-a$/, /search-b$/]);
        await expect(locations.rowStatus(searchB)).toHaveText('1 found');
      });

      await test.step('Verify search-b is saved in the preferences', async () => {
        await expect.poll(() => readSavedSearchFolders(electronApp)).toEqual([searchA, searchB]);
      });

      await test.step('Go back to My computer', async () => {
        await openCollectionModal.backButton().click();
      });

      await test.step('Verify My computer lists the collection in search-b', async () => {
        await expect(myComputer.row('Gamma API')).toBeVisible();
      });
    });

    test('shows an added folder that was deleted as Not found after a rescan', async ({ pageWithUserData: page }) => {
      const locations = buildLocationsLocators(page);
      const myComputer = buildMyComputerLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);

      await test.step('Create the search-gone folder and add it as a search location', async () => {
        await fs.promises.mkdir(goneFolder, { recursive: true });
        await showLocations(page);
        await addSearchLocation(page, electronApp, goneFolder);
      });

      await test.step('Delete search-gone on disk', async () => {
        await fs.promises.rm(goneFolder, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      });

      await test.step('Rescan from My computer and go back to Locations', async () => {
        await openCollectionModal.backButton().click();
        await rescanMyComputer(page);
        await myComputer.manageButton().click();
      });

      await test.step('Verify search-gone is still listed, as Not found', async () => {
        await expect(locations.rowStatus(goneFolder)).toHaveText('Not found');
      });
    });

    test('stops searching a folder after it is removed', async ({ pageWithUserData: page }) => {
      const locations = buildLocationsLocators(page);
      const myComputer = buildMyComputerLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);

      await test.step('Add search-b and go back to My computer', async () => {
        await showLocations(page);
        await addSearchLocation(page, electronApp, searchB);
        await openCollectionModal.backButton().click();
      });

      await test.step('Verify My computer lists Gamma API from search-b', async () => {
        await expect(myComputer.row('Gamma API')).toBeVisible();
      });

      await test.step('Remove search-b on Locations', async () => {
        await myComputer.manageButton().click();
        await locations.rowRemoveButton(searchB).click();
      });

      await test.step('Verify search-b is no longer listed or saved', async () => {
        await expect(locations.row(searchB)).toHaveCount(0);
        await expect.poll(() => readSavedSearchFolders(electronApp)).toEqual([searchA]);
      });

      await showMyComputer(page);

      await test.step('Verify My computer no longer lists Gamma API', async () => {
        await expect(myComputer.row('Gamma API')).toHaveCount(0);
      });
    });

    test('adds a folder picked on Choose folder from its note', async ({ pageWithUserData: page }) => {
      const locations = buildLocationsLocators(page);
      const myComputer = buildMyComputerLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);

      await chooseFolders(page, electronApp, [searchC]);

      await test.step('Verify the note offers to add search-c to the search locations', async () => {
        await expect(openCollectionModal.noteActionButton()).toHaveText('Add to search locations');
      });

      await test.step('Click Add to search locations in the note', async () => {
        await openCollectionModal.noteActionButton().click();
      });

      await test.step('Verify the note says Bruno now searches search-c', async () => {
        await expect(openCollectionModal.note()).toHaveText('Bruno now also searches search-c. Its collections show up in My computer too.');
      });

      await showLocations(page);

      await test.step('Verify Locations lists search-c with the collections found in it', async () => {
        await expect(locations.rowStatus(searchC)).toHaveText('2 found');
      });

      await test.step('Go back to My computer', async () => {
        await openCollectionModal.backButton().click();
      });

      await test.step('Verify My computer lists the collections in search-c', async () => {
        await expect(myComputer.row('Delta API')).toBeVisible();
        await expect(myComputer.row('Epsilon API')).toBeVisible();
      });
    });

    test('lists a folder that is already searched only once', async ({ pageWithUserData: page }) => {
      const locations = buildLocationsLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);

      await chooseFolders(page, electronApp, [searchA]);

      await test.step('Verify the note offers to add search-a to the search locations', async () => {
        await expect(openCollectionModal.noteActionButton()).toHaveText('Add to search locations');
      });

      await test.step('Click Add to search locations in the note', async () => {
        await openCollectionModal.noteActionButton().click();
      });

      await test.step('Verify the note no longer offers to add the folder', async () => {
        await expect(openCollectionModal.noteActionButton()).toBeHidden();
      });

      await showLocations(page);

      await test.step('Verify Locations lists search-a once', async () => {
        await expect(locations.rowLabels()).toHaveText(['Default collection location', 'Documents/bruno', 'All open workspace folders', /search-a$/]);
      });

      await test.step('Verify the saved search folders did not change', async () => {
        await expect.poll(() => readSavedSearchFolders(electronApp)).toEqual([searchA]);
      });
    });
  });
});
