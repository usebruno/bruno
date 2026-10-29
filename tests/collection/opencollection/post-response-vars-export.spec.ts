import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  expandFolder,
  openCollectionSettings,
  openFolderSettings,
  openRequest,
  openShareCollectionModal,
  saveRequest,
  selectCollectionPaneTab,
  selectfolderPaneTab,
  selectRequestPaneTab
} from '../../utils/page';
import { addVarsRow } from '../../utils/request';

const COLLECTION_NAME = 'post-response-vars';
const FOLDER_NAME = 'Auth';
const REQUEST_NAME = 'Login';

const expectExportedYaml = (yaml: string) => {
  const [itemsYaml, collectionRequest = ''] = yaml.split(/\nrequest:\n/);
  const folderBlock = itemsYaml.split(/name: Login/)[0];
  const requestItem = itemsYaml.split(/name: Login/)[1] ?? '';

  expect(collectionRequest).toContain('actions:');
  expect(collectionRequest).toContain('name: token');
  expect(collectionRequest).toContain('name: baseUrl');

  expect(folderBlock).toMatch(/actions:[\s\S]*name: refresh/);
  expect(folderBlock).toContain('name: authPath');

  expect(requestItem).toContain('name: grant');
  expect(requestItem).toContain('name: sessionId');
};

test.describe('TC-4461', { tag: '@sanity' }, () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('collection and folder post-response vars round-trip in OpenCollection YAML', async ({
    page,
    electronApp,
    createTmpDir
  }, testInfo) => {
    testInfo.setTimeout(90_000);
    const collectionDir = path.join(await createTmpDir(COLLECTION_NAME), COLLECTION_NAME);
    const exportedFile = path.join(await createTmpDir('exported-yaml'), `${COLLECTION_NAME}.yml`);
    const collectionFile = path.join(collectionDir, 'opencollection.yml');
    const folderFile = path.join(collectionDir, FOLDER_NAME, 'folder.yml');
    const requestFile = path.join(collectionDir, FOLDER_NAME, `${REQUEST_NAME}.yml`);
    const locators = buildCommonLocators(page);

    await test.step('Create an OpenCollection YAML collection, folder, and request', async () => {
      await createCollection(page, COLLECTION_NAME, path.dirname(collectionDir));
      await createFolder(page, FOLDER_NAME, COLLECTION_NAME);
      await expandFolder(page, FOLDER_NAME);
      await createRequest(page, REQUEST_NAME, FOLDER_NAME, { inFolder: true });
    });

    await test.step('Add pre-request and post-response vars at collection, folder, and request', async () => {
      await openCollectionSettings(page, COLLECTION_NAME);
      await selectCollectionPaneTab(page, 'vars');
      await addVarsRow(page, 'collection-vars-req', 'baseUrl', 'https://api.example.com');
      await addVarsRow(page, 'collection-vars-res', 'token', 'res.body.token');
      await locators.varsPanel('collection').saveButton().click();
      await expect.poll(() => fs.readFileSync(collectionFile, 'utf8')).toContain('name: token');

      await openFolderSettings(page, COLLECTION_NAME, FOLDER_NAME);
      await selectfolderPaneTab(page, 'vars');
      await addVarsRow(page, 'folder-vars-req', 'authPath', '/login');
      await addVarsRow(page, 'folder-vars-res', 'refresh', 'res.body.refresh');
      await locators.varsPanel('folder').saveButton().click();
      await expect.poll(() => fs.readFileSync(folderFile, 'utf8')).toContain('name: refresh');

      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await selectRequestPaneTab(page, 'Vars');
      await addVarsRow(page, 'request-vars-req', 'grant', 'password');
      await addVarsRow(page, 'request-vars-res', 'sessionId', 'res.body.sessionId');
      await saveRequest(page);
      await expect.poll(() => fs.readFileSync(requestFile, 'utf8')).toContain('name: sessionId');
    });

    await test.step('Export the collection as a single OpenCollection YAML file', async () => {
      await electronApp.evaluate(({ session }, filePath) => {
        session.defaultSession.once('will-download', (_event, item) => {
          item.setSavePath(filePath);
        });
      }, exportedFile);

      await openShareCollectionModal(page, COLLECTION_NAME);
      const exportTab = page.locator('.bruno-modal').getByText('Export', { exact: true });
      if (await exportTab.isVisible()) {
        await exportTab.click();
      }
      await page.getByText('Single File (YAML)', { exact: true }).click();
      await locators.modal.button('Proceed').click();
      await expect.poll(() => fs.existsSync(exportedFile), { timeout: 10000 }).toBe(true);
    });

    await test.step('Exported YAML keeps collection and folder actions and the pre-request vars', async () => {
      expectExportedYaml(fs.readFileSync(exportedFile, 'utf8'));
    });
  });
});
