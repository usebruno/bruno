import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
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

type VarsBlock = {
  variables?: { name?: string }[];
  actions?: { phase?: string; variable?: { name?: string } }[];
};

const expectPreRequestVar = (block: VarsBlock | undefined, name: string) => {
  expect(block?.variables?.map((variable) => variable.name)).toContain(name);
};

const expectPostResponseVar = (block: VarsBlock | undefined, name: string) => {
  expect(block?.actions).toEqual(expect.arrayContaining([
    expect.objectContaining({
      phase: 'after-response',
      variable: expect.objectContaining({ name })
    })
  ]));
};

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

    await test.step('Verify exported YAML keeps pre-request vars and post-response actions', async () => {
      const doc = YAML.parse(fs.readFileSync(exportedFile, 'utf8'));
      const folder = doc.items?.find((item: { info?: { name?: string } }) => item.info?.name === FOLDER_NAME);
      const request = folder?.items?.find((item: { info?: { name?: string } }) => item.info?.name === REQUEST_NAME);

      expectPreRequestVar(doc.request, 'baseUrl');
      expectPostResponseVar(doc.request, 'token');

      expectPreRequestVar(folder?.request, 'authPath');
      expectPostResponseVar(folder?.request, 'refresh');

      expectPreRequestVar(request?.runtime, 'grant');
      expectPostResponseVar(request?.runtime, 'sessionId');
    });
  });
});
