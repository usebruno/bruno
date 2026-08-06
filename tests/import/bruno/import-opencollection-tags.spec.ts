import { test, expect, Page } from '../../../playwright';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  exportOpenCollectionYaml,
  importCollection,
  openRequest,
  saveRequest,
  selectRequestPaneTab
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'Numeric Tags Roundtrip';
const REQUEST_NAME = 'tagged-request';

// Force request tags to include a bare YAML number so re-import hits the pre-fix failure shape.
// NOTE: only needed in this test because we're adding a number tag to the request.
const forceUnquotedNumericTags = (exportedYaml: string): string => {
  const doc = yaml.load(exportedYaml) as {
    items?: Array<{ info?: { tags?: unknown[] } }>;
  };
  const item = doc?.items?.[0];
  if (!item?.info) {
    throw new Error('Exported OpenCollection YAML is missing items[0].info');
  }
  item.info.tags = ['close-code', 1000];
  return yaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
};

test.describe('OpenCollection numeric tags import', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('re-imports exported YAML after tags are forced to unquoted numbers', async ({ page, createTmpDir }) => {
    const collectionDir = await createTmpDir('numeric-tags-source');
    const exportDir = await createTmpDir('numeric-tags-export');
    const reimportDir = await createTmpDir('numeric-tags-reimport');
    const locators = buildCommonLocators(page);

    await test.step('Create a YAML collection and request', async () => {
      await createCollection(page, COLLECTION_NAME, collectionDir, 'yml');
      await createRequest(page, REQUEST_NAME, COLLECTION_NAME, {
        url: 'https://echo.usebruno.com',
        method: 'GET'
      });
    });

    await test.step('Add a number tag on the request', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await locators.tabs.requestTab(REQUEST_NAME).waitFor({ state: 'visible' });
      await selectRequestPaneTab(page, 'Settings');
      await expect(locators.tags.input()).toBeVisible();

      const tag = '1000';
      await locators.tags.input().fill(tag);
      await locators.tags.input().press('Enter');
      await expect(locators.tags.item(tag)).toBeVisible();

      await saveRequest(page);
    });

    let mutatedPath: string;
    await test.step('Export YAML and rewrite tags to unquoted 1000', async () => {
      const { content, fileName } = await exportOpenCollectionYaml(page, COLLECTION_NAME);
      expect(fileName).toMatch(/\.yml$/i);

      const mutated = forceUnquotedNumericTags(content);
      expect(mutated).toMatch(/^\s+- 1000\s*$/m);

      mutatedPath = path.join(exportDir, fileName);
      fs.writeFileSync(mutatedPath, mutated, 'utf8');
    });

    await test.step('Close collection before re-import', async () => {
      await closeAllCollections(page);
    });

    await test.step('Import the mutated YAML with numeric tags', async () => {
      await importCollection(page, mutatedPath!, reimportDir, {
        expectedCollectionName: COLLECTION_NAME
      });
    });

    await test.step('Assert tags survived the numeric-tag import', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await locators.tabs.requestTab(REQUEST_NAME).waitFor({ state: 'visible' });
      await selectRequestPaneTab(page, 'Settings');
      await expect(locators.tags.item('close-code')).toBeVisible();
      await expect(locators.tags.item('1000')).toBeVisible();
    });
  });
});
