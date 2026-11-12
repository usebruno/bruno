import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import YAML from 'yaml';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  exportCollectionAsSingleYaml,
  exportCollectionAsZip,
  exportCollectionToPostman
} from '../../utils/page';
import {
  closeShareCollection,
  openExportTabIfPresent,
  openShareCollection,
  proceedToExportApiSpec,
  saveOpenApiSpecification,
  selectOpenApiFormat
} from '../../utils/page/collection/share-collection';

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

  test('TC-3050: Verify that the user is able to Export a OpenAPI Specification collection', { tag: '@sanity' }, async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const collectionName = 'new-collection';
    const collectionLocation = await createTmpDir(collectionName);
    const exportLocation = await createTmpDir(`${collectionName}-output`);
    const { sidebar, shareCollection } = buildCommonLocators(page);

    await test.step('Create a collection with an HTTP request and a gRPC request', async () => {
      await createCollection(page, collectionName, collectionLocation, 'yml');
      await expect(sidebar.collection(collectionName)).toBeVisible();
      await createRequest(page, 'ping', collectionName, {
        url: 'http://localhost:8081/ping',
        method: 'GET'
      });
      await createRequest(page, 'grpc-request', collectionName, {
        url: 'grpc://localhost:50051',
        requestType: 'grpc'
      });
    });

    await openShareCollection(page, collectionName);
    await openExportTabIfPresent(page);

    const openApiCard = shareCollection.openApiCard();
    const isEnterprise = await openApiCard.isVisible();

    if (isEnterprise) {
      const filePath = path.join(exportLocation, `${collectionName}.yaml`);
      await selectOpenApiFormat(page);

      await test.step('gRPC requests are skipped with a note', async () => {
        await expect(shareCollection.nonExportableNote()).toBeVisible();
        await expect(shareCollection.nonExportableNote()).toContainText(
          'gRPC requests in this collection will not be exported'
        );
      });

      await proceedToExportApiSpec(page);

      await test.step('Export API Spec uses the collection name as the default file name', async () => {
        await expect(shareCollection.nameInput()).toHaveValue(collectionName);
      });

      await saveOpenApiSpecification(page, electronApp, exportLocation);

      await test.step('Verify that the exported OpenAPI spec contains the HTTP request only', async () => {
        await expect(shareCollection.exportedToast().first()).toBeVisible();
        await expect.poll(() => fs.existsSync(filePath)).toBe(true);
        const spec = YAML.parse(fs.readFileSync(filePath, 'utf8'));
        expect(spec).toMatchObject({
          openapi: expect.stringMatching(/^3\./),
          info: { title: collectionName }
        });
        expect(spec.paths).toHaveProperty('/ping');
        expect(JSON.stringify(spec)).not.toMatch(/grpc/i);
      });
    } else {
      await test.step('OSS Share Collection does not offer OpenAPI Specification', async () => {
        await expect(openApiCard).toBeHidden();
        await expect(shareCollection.zipCard()).toBeVisible();
        await expect(shareCollection.yamlCard()).toBeVisible();
        await expect(shareCollection.postmanCard()).toBeVisible();
      });
      await closeShareCollection(page);
    }
  });
});
