import path from 'node:path';
import { test, Page, ElectronApplication } from '../../playwright';
import { buildGenerateDocsLocators } from './docs';

// Locators for the collection settings Overview info column.
export const buildCollectionSettingsOverviewLocators = (page: Page) => ({
  locationLabel: () => page.getByTestId('info-location-label'),
  collectionLocation: () => page.getByTestId('info-collection-location'),
  environmentsLabel: () => page.getByTestId('info-environments-label'),
  collectionEnvironmentCount: () => page.getByTestId('info-collection-environment-count'),
  globalEnvironmentCount: () => page.getByTestId('info-global-environment-count'),
  requestsLabel: () => page.getByTestId('info-requests-label'),
  requestCount: () => page.getByTestId('info-request-count'),
  shareLabel: () => page.getByTestId('info-share-label'),
  shareCollection: () => page.getByTestId('info-share-collection'),
  documentationLabel: () => page.getByTestId('info-documentation-label'),
  generateDocs: () => page.getByTestId('info-generate-docs')
});

/**
 * Click Generate in the open Generate Documentation modal and save the HTML into `saveDirectory`.
 * Electron shows a save dialog for this download, so the save path is set on `will-download`.
 */
export const saveGeneratedDocs = async (page: Page, electronApp: ElectronApplication, saveDirectory: string) => {
  await test.step(`Save generated docs to ${saveDirectory}`, async () => {
    const generateDocs = buildGenerateDocsLocators(page);
    await electronApp.evaluate(({ session }, { directory, separator }) => {
      session.defaultSession.once('will-download', (_event, item) => {
        item.setSavePath(`${directory}${separator}${item.getFilename()}`);
      });
    }, { directory: saveDirectory, separator: path.sep });

    await generateDocs.generateButton().click();
    await generateDocs.modal().waitFor({ state: 'hidden' });
  });
};
