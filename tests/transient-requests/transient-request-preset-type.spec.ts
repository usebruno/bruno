import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createTransientRequestFromPreset,
  setRequestTypePreset,
  PresetRequestType
} from '../utils/page';

const PRESET_CASES: { requestType: PresetRequestType; label: string; tabMethod: string }[] = [
  { requestType: 'http', label: 'HTTP', tabMethod: 'GET' },
  { requestType: 'graphql', label: 'GraphQL', tabMethod: 'GQL' },
  { requestType: 'grpc', label: 'gRPC', tabMethod: 'gRPC' },
  { requestType: 'ws', label: 'WebSocket', tabMethod: 'WS' }
];

test.describe.serial('Transient request type follows the collection preset', () => {
  const collectionName = 'transient-preset-type';

  test.beforeAll(async ({ page, createTmpDir }) => {
    await createCollection(page, collectionName, await createTmpDir('transient-preset-type'));
    await expect(buildCommonLocators(page).sidebar.collection(collectionName)).toBeVisible();
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  for (const { requestType, label, tabMethod } of PRESET_CASES) {
    test(`Left-clicking + opens a ${label} request when the ${label} preset is saved`, async ({ page }) => {
      const locators = buildCommonLocators(page);

      await test.step(`Save "${label}" as the default request type preset`, async () => {
        await setRequestTypePreset(page, collectionName, requestType);
      });

      await test.step('Create a transient request with a left click on +', async () => {
        await createTransientRequestFromPreset(page);
      });

      await test.step(`Verify the opened request is a ${label} request`, async () => {
        await expect(locators.tabs.activeRequestTabMethod()).toHaveText(tabMethod);
      });
    });
  }
});
