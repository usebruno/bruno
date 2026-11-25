import * as path from 'path';
import { test, Page, ElectronApplication } from '../../playwright';
import { mockBrowseFiles } from '../request/body';
import { buildCollectionListLocators } from './collection-list';
import { buildOpenCollectionModalLocators, showOpenCollectionModal } from './shell';

export const buildChooseFolderLocators = (page: Page) => ({
  ...buildCollectionListLocators(page, 'choose-folder'),
  dropZone: () => page.getByTestId('choose-folder-drop-zone'),
  chooseLink: () => page.getByTestId('choose-folder-choose-link'),
  shortcut: () => page.getByTestId('choose-folder-shortcut'),
  chooseOtherLink: () => page.getByTestId('choose-folder-choose-other'),
  summary: () => buildOpenCollectionModalLocators(page).pageView('choose-folder').getByRole('strong')
});

export const chooseFolders = async (page: Page, electronApp: ElectronApplication, folderPaths: string[]) => {
  await test.step(`Choose folders "${folderPaths.map((folderPath) => path.basename(folderPath)).join('", "')}"`, async () => {
    await mockBrowseFiles(electronApp, folderPaths);
    await showOpenCollectionModal(page, 'choose-folder');
    await buildChooseFolderLocators(page).chooseLink().click();
  });
};

export const chooseOtherFolders = async (page: Page, electronApp: ElectronApplication, folderPaths: string[]) => {
  await test.step(`Choose other folders "${folderPaths.map((folderPath) => path.basename(folderPath)).join('", "')}"`, async () => {
    await mockBrowseFiles(electronApp, folderPaths);
    await buildChooseFolderLocators(page).chooseOtherLink().click();
  });
};

export const openListedCollection = async (page: Page, collectionName: string) => {
  await test.step(`Open "${collectionName}" from its row in the Choose folder list`, async () => {
    const chooseFolder = buildChooseFolderLocators(page);
    await chooseFolder.row(collectionName).hover();
    await chooseFolder.rowOpenButton(collectionName).click({ force: true });
  });
};
