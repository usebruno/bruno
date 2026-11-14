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
  exportCollectionAsSingleYaml,
  openCollectionSettings,
  openFolderSettings,
  openRequest,
  saveRequest,
  selectCollectionPaneTab,
  selectfolderPaneTab,
  selectRequestPaneTab
} from '../../utils/page';
import { addVarsRow } from '../../utils/request/vars';

const COLLECTION_NAME = 'post-response-vars';
const FOLDER_NAME = 'Auth';
const REQUEST_NAME = 'Login';

test.describe('OpenCollection post-response vars export', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-4461: Collection and folder post-response vars round-trip in OpenCollection YAML', { tag: '@sanity' }, async ({
    page,
    electronApp,
    createTmpDir
  }, testInfo) => {
    testInfo.setTimeout(60_000);
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
      await exportCollectionAsSingleYaml(page, electronApp, COLLECTION_NAME, path.dirname(exportedFile));
    });

    await test.step('Verify exported YAML keeps collection and folder actions and the pre-request vars', async () => {
      const yaml = fs.readFileSync(exportedFile, 'utf8');
      // Collection vars are the root request block, written after the items.
      // Folder and request blocks use an indented request key, so this split
      // only separates the collection block.
      const [itemsYaml, collectionYaml = ''] = yaml.split('\nrequest:\n');
      const folderYaml = itemsYaml.split(`name: ${FOLDER_NAME}`)[1].split(`name: ${REQUEST_NAME}`)[0];
      const requestYaml = itemsYaml.split(`name: ${REQUEST_NAME}`)[1];

      expect(collectionYaml).toContain('actions:');
      expect(collectionYaml).toContain('name: baseUrl');
      expect(collectionYaml).toContain('name: token');

      expect(folderYaml).toContain('actions:');
      expect(folderYaml).toContain('name: authPath');
      expect(folderYaml).toContain('name: refresh');

      expect(requestYaml).toContain('actions:');
      expect(requestYaml).toContain('name: grant');
      expect(requestYaml).toContain('name: sessionId');
    });
  });
});
