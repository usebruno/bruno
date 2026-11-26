import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, dismissModalIfOpen } from '../../../pages';
import {
  buildOpenCollectionModalLocators,
  closeOpenCollectionModal,
  pressOpenCollectionShortcut,
  showOpenCollectionModal
} from '../../../pages/open-collection-modal/shell';
import {
  buildImportPageLocators,
  dropImportFiles,
  selectImportFiles,
  selectImportFilesWithFileChooser
} from '../../../pages/open-collection-modal/import-page';
import { importFixturePath, writeZip } from './helpers';

const importShortcut = process.platform === 'darwin' ? '⌘ O' : 'Ctrl+O';

const PING_REQUEST = `meta {
  name: ping
  type: http
  seq: 1
}

get {
  url: http://localhost:8081/ping
  body: none
  auth: none
}
`;

test.describe('Open collection modal: importing files', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await dismissModalIfOpen(page);
    await closeOpenCollectionModal(page);
    await closeAllCollections(page);
  });

  test('the import shortcut shows an empty Import page', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const importPage = buildImportPageLocators(page);

    await test.step('Press the import shortcut', async () => {
      await pressOpenCollectionShortcut(page, 'import');
    });

    await test.step('Verify the Import page waits for a URL, text or files', async () => {
      await expect(openCollectionModal.pageTitle()).toHaveText('Import');
      await expect(importPage.textInput()).toHaveValue('');
      await expect(importPage.textInput()).toHaveAttribute('placeholder', 'Paste a URL or raw JSON/YAML');
      await expect(importPage.enterHint()).toBeHidden();
      await expect(importPage.zipWarning()).toBeHidden();
      await expect(importPage.dropZone()).toContainText('Drop anywhere to import');
      await expect(importPage.dropZone()).toContainText('Postman · Insomnia · OpenAPI · WSDL · OpenCollection · Bruno');
      await expect(importPage.selectFilesLink()).toBeVisible();
      await expect(importPage.shortcut()).toHaveText(importShortcut);
    });

    await test.step('Verify the link to the import docs', async () => {
      await expect(importPage.docsLink()).toHaveText('Migrating from other tools?');
    });
  });

  test('one collection file opens the location modal and imports into the chosen folder', async ({ pageWithUserData: page, createTmpDir }) => {
    const { import: importLocators, sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const collectionLocation = await createTmpDir('import-one-file');

    await test.step('Select a Postman file on the Import page', async () => {
      await selectImportFiles(page, [importFixturePath('sample-postman.json')]);
    });

    await test.step('Verify the location modal replaces the Open collection modal', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
      await expect(openCollectionModal.root()).toBeHidden();
    });

    await test.step('Import into a temporary folder', async () => {
      await importLocators.locationInput().fill(collectionLocation);
      await importLocators.importButton().click();
    });

    await test.step('Verify the collection is in the sidebar and on disk', async () => {
      await expect(importLocators.locationModal()).toBeHidden();
      await expect(sidebar.collection('Sample Postman Collection')).toBeVisible();
      await expect.poll(() => fs.existsSync(path.join(collectionLocation, 'Sample Postman Collection', 'opencollection.yml'))).toBe(true);
    });
  });

  test('select files opens the file chooser, and an OpenAPI file offers its folder arrangement', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);

    await test.step('Select an OpenAPI file in the file chooser', async () => {
      await selectImportFilesWithFileChooser(page, [importFixturePath('sample-openapi.yaml')]);
    });

    await test.step('Verify the location modal offers the folder arrangement for the spec', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample API');
      await expect(importLocators.groupingDropdown()).toBeVisible();
    });
  });

  test('several collection files open the Bulk Import modal and import together', async ({ pageWithUserData: page, createTmpDir }) => {
    const { import: importLocators, sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const collectionLocation = await createTmpDir('import-several-files');

    await test.step('Select a Postman file and an Insomnia file on the Import page', async () => {
      await selectImportFiles(page, [importFixturePath('sample-postman.json'), importFixturePath('sample-insomnia.json')]);
    });

    await test.step('Verify the Bulk Import modal lists both files, selected', async () => {
      await expect(importLocators.bulkCollectionCheckbox('sample-postman.json')).toBeChecked();
      await expect(importLocators.bulkCollectionCheckbox('sample-insomnia.json')).toBeChecked();
      await expect(openCollectionModal.root()).toBeHidden();
    });

    await test.step('Import both into a temporary folder', async () => {
      await importLocators.bulkLocationInput().fill(collectionLocation);
      await importLocators.bulkSubmitButton().click();
    });

    await test.step('Verify the import finished', async () => {
      await expect(importLocators.bulkSubmitButton()).toHaveText('Close');
    });

    await test.step('Close the Bulk Import modal', async () => {
      await importLocators.bulkSubmitButton().click();
    });

    await test.step('Verify both collections are in the sidebar', async () => {
      await expect(importLocators.bulkModal()).toBeHidden();
      await expect(sidebar.collection('Sample Postman Collection')).toBeVisible();
      await expect(sidebar.collection('Sample Insomnia Collection')).toBeVisible();
    });
  });

  test('a file that is not a collection is left out of the Bulk Import with a toast', async ({ pageWithUserData: page }) => {
    const { import: importLocators, toast } = buildCommonLocators(page);

    await test.step('Select a Postman file and a broken file on the Import page', async () => {
      await selectImportFiles(page, [importFixturePath('sample-postman.json'), importFixturePath('broken.json')]);
    });

    await test.step('Verify the broken file is skipped and the Postman file is offered', async () => {
      await expect(toast.byMessage('broken.json isn’t a valid collection, so it was skipped.')).toBeVisible();
      await expect(importLocators.bulkCollectionCheckbox('sample-postman.json')).toBeChecked();
      await expect(importLocators.bulkCollectionCheckbox('broken.json')).toHaveCount(0);
    });
  });

  test('a Bruno ZIP opens the location modal and imports the collection inside it', async ({ pageWithUserData: page, createTmpDir }) => {
    const { import: importLocators, sidebar } = buildCommonLocators(page);
    const zipFile = path.join(await createTmpDir('import-zip-source'), 'Zipped Collection.zip');
    const collectionLocation = await createTmpDir('import-zip-location');

    await test.step('Zip a Bruno collection', async () => {
      writeZip(zipFile, {
        'bruno.json': JSON.stringify({ version: '1', name: 'Zipped Collection', type: 'collection' }),
        'ping.bru': PING_REQUEST
      });
    });

    await test.step('Select the ZIP on the Import page', async () => {
      await selectImportFiles(page, [zipFile]);
    });

    await test.step('Verify the location modal opens for the zipped collection without the Options menu', async () => {
      await expect(importLocators.locationModal()).toContainText('Zipped Collection');
      await expect(importLocators.optionsMenuButton()).toHaveCount(0);
    });

    await test.step('Import into a temporary folder', async () => {
      await importLocators.locationInput().fill(collectionLocation);
      await importLocators.importButton().click();
    });

    await test.step('Verify the collection is in the sidebar with its request on disk', async () => {
      await expect(sidebar.collection('Zipped Collection')).toBeVisible();
      await expect.poll(() => fs.existsSync(path.join(collectionLocation, 'Zipped Collection', 'ping.bru'))).toBe(true);
    });
  });

  test('cancelling the location modal imports nothing', async ({ pageWithUserData: page, createTmpDir }) => {
    const { import: importLocators, modal, sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const collectionLocation = await createTmpDir('import-cancelled');

    await test.step('Select a Postman file and enter a temporary folder', async () => {
      await selectImportFiles(page, [importFixturePath('sample-postman.json')]);
      await importLocators.locationInput().fill(collectionLocation);
    });

    await test.step('Cancel the location modal', async () => {
      await modal.button('Cancel').click();
    });

    await test.step('Verify no modal is left open and nothing was imported', async () => {
      await expect(importLocators.locationModal()).toBeHidden();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Sample Postman Collection')).toHaveCount(0);
      expect(fs.readdirSync(collectionLocation)).toEqual([]);
    });
  });

  test('dropping a collection file on the modal opens the location modal for it', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show Choose folder in the Open collection modal', async () => {
      await showOpenCollectionModal(page, 'choose-folder');
    });

    await test.step('Drop a Postman file on the modal', async () => {
      await dropImportFiles(page, [importFixturePath('sample-postman.json')]);
    });

    await test.step('Verify the location modal opens for the dropped collection', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
      await expect(openCollectionModal.root()).toBeHidden();
    });
  });
});
