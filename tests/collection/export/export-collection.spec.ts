import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import YAML from 'yaml';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  exportCollectionAsSingleYaml,
  exportCollectionAsZip,
  exportCollectionToPostman
} from '../../utils/page';

const collectionName = 'export-collection';
const postmanCollectionName = 'export-postman';
const singleYamlCollectionName = 'export-single-yaml';

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

    await test.step('Collection exported toast is shown', async () => {
      await expect(toast.byMessage('Collection exported successfully').first()).toBeVisible(); ;
    });

    await test.step('Exported Postman collection file is written', async () => {
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

    await test.step('Collection exported toast is shown', async () => {
      expect(toast.byMessage('Collection exported successfully').first()).toBeVisible();
    });

    await test.step('Exported collection file is written', async () => {
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

    await test.step('Collection exported toast is shown', async () => {
      await expect(toast.byMessage('Collection exported successfully').first()).toBeVisible(); ;
    });

    await test.step('Exported YAML file contains the collection', async () => {
      const filePath = path.join(exportLocation, `${singleYamlCollectionName}.yml`);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(YAML.parse(content)).toMatchObject({
        opencollection: '1.0.0',
        info: { name: singleYamlCollectionName }
      });
    });
  });
});
