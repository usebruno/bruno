import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import YAML from 'yaml';
import { test, expect, closeElectronApp, ElectronApplication, waitForReadyPage } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  exportCollectionAsSingleYaml,
  exportCollectionAsZip,
  exportCollectionToPostman,
  openShareCollectionModal
} from '../../../pages';
import { buildShareCollectionLocators } from '../../../pages/collection/share-collection';

const collectionName = 'export-collection';
const postmanCollectionName = 'export-postman';
const singleYamlCollectionName = 'export-single-yaml';
const postmanGrpcCollectionName = 'export-postman-grpc';

test.describe('Export Bruno collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-130: Verify that the user is able to Export a postman collection', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionLocation = await createTmpDir('export-postman-source');
    const exportLocation = await createTmpDir('export-postman-output');
    const { sidebar, toast } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, postmanCollectionName, collectionLocation, 'yml');
      await expect(sidebar.collection(postmanCollectionName)).toBeVisible();
    });

    const exported = await test.step('Export the collection to Postman', async () => {
      return exportCollectionToPostman(page, postmanCollectionName, exportLocation);
    });

    await test.step('Verify that the collection exported success toast is displayed', async () => {
      await expect(toast.byMessage('Collection exported successfully').first()).toBeVisible(); ;
    });

    await test.step('Verify that the exported Postman collection file is written', async () => {
      const filePath = path.join(exportLocation, `${postmanCollectionName}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(exported).toMatchObject({
        info: {
          name: postmanCollectionName,
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        }
      });
    });
  });

  test('TC:3047: Verify that the user is able to Export a Bruno collection', { tag: '@sanity' }, async ({ page, electronApp, createTmpDir }) => {
    const collectionLocation = await createTmpDir('export-collection-source');
    const exportLocation = await createTmpDir('export-collection-output');
    const { sidebar, toast } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, collectionLocation, 'yml');
      await expect(sidebar.collection(collectionName)).toBeVisible();
    });

    const zippedFiles = await test.step('Export the Bruno collection into a directory', async () => {
      return exportCollectionAsZip(page, electronApp, collectionName, exportLocation);
    });

    await test.step('Verify that the collection exported success toast is displayed', async () => {
      await expect(toast.byMessage('Collection exported successfully').first()).toBeVisible();
    });

    await test.step('Verify that the exported collection file is written', async () => {
      const zipPath = path.join(exportLocation, `${collectionName}.zip`);
      expect(fs.existsSync(zipPath)).toBe(true);
      expect(zippedFiles).toContain('opencollection.yml');

      const collectionFile = YAML.parse(new AdmZip(zipPath).readAsText('opencollection.yml'));
      expect(collectionFile).toMatchObject({
        info: { name: collectionName }
      });
    });
  });

  test('TC-3048: Verify that the user is able to Export a collection as a single file (YAML)', { tag: '@sanity' }, async ({ page, electronApp, createTmpDir }) => {
    const collectionLocation = await createTmpDir('export-yaml-source');
    const exportLocation = await createTmpDir('export-yaml-output');
    const { sidebar, toast } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, singleYamlCollectionName, collectionLocation, 'yml');
      await expect(sidebar.collection(singleYamlCollectionName)).toBeVisible();
    });

    const content = await test.step('Export the collection as a single YAML file', async () => {
      return exportCollectionAsSingleYaml(page, electronApp, singleYamlCollectionName, exportLocation);
    });

    await test.step('Verify that the collection exported success toast is displayed', async () => {
      await expect(toast.byMessage('Collection exported successfully').first()).toBeVisible(); ;
    });

    await test.step('Verify that the exported file contains the collection', async () => {
      const filePath = path.join(exportLocation, `${singleYamlCollectionName}.yml`);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(YAML.parse(content)).toMatchObject({
        opencollection: '1.0.0',
        info: { name: singleYamlCollectionName }
      });
    });
  });
});

test.describe('Export a collection with gRPC requests to Postman', () => {
  test('TC-3050: Verify that exporting to Postman skips gRPC requests with a note', { tag: '@sanity' }, async ({
    launchElectronApp,
    collectionFixturePath,
    createTmpDir
  }) => {
    const exportLocation = await createTmpDir(`${postmanGrpcCollectionName}-output`);
    let app: ElectronApplication | undefined;

    try {
      app = await launchElectronApp({
        initUserDataPath: path.join(__dirname, 'init-user-data'),
        templateVars: { collectionPath: collectionFixturePath! }
      });
      const page = await waitForReadyPage(app);
      const { sidebar } = buildCommonLocators(page);
      const shareCollection = buildShareCollectionLocators(page);

      await test.step('Verify the fixture collection with an HTTP request and a gRPC request opens', async () => {
        await expect(sidebar.collection(postmanGrpcCollectionName)).toBeVisible();
      });

      await openShareCollectionModal(page, postmanGrpcCollectionName);

      await test.step('Verify that selecting Postman shows the gRPC skip note', async () => {
        await shareCollection.postmanFormatCard().click();
        await expect(shareCollection.nonExportableNote()).toContainText(
          'gRPC requests in this collection will not be exported'
        );
        await shareCollection.closeButton().click();
        await expect(shareCollection.modal()).toBeHidden();
      });

      const exported = await exportCollectionToPostman(page, postmanGrpcCollectionName, exportLocation);

      await test.step('Verify that the Postman export contains the HTTP request only', async () => {
        expect(exported.info.name).toBe(postmanGrpcCollectionName);
        expect(exported.item.map((item: { name: string }) => item.name)).toEqual(['ping']);
      });
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  });
});
