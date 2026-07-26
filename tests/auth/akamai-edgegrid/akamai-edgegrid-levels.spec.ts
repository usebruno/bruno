import { expect, test } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  getResponseBody,
  openFolderRequest,
  openRequest,
  selectAuthMode,
  selectRequestPaneTab,
  sendRequestAndWaitForResponse
} from '../../utils/page';

/**
 * EdgeGrid is configurable at collection settings, folder settings, and request level. These
 * tests verify each renders without crashing (collection-level was a `null` crash regression),
 * persists all 8 fields across a save, and that a request which inherits the auth actually
 * signs and is accepted by the local simulator - asserting the echoed effective values.
 */

const { TEST_EDGEGRID } = require('../../../packages/bruno-tests/src/auth/edgegrid');
const SIMULATOR_URL = 'http://localhost:8081/api/auth/edgegrid/resource';

const label = (page, text: string) => page.locator('label').filter({ hasText: text });
const fieldRow = (page, text: string) => label(page, text).locator('..');
const editorIn = (row) => row.locator('.single-line-editor-wrapper .CodeMirror');
const advancedHeader = (page) => page.locator('.advanced-settings-header').filter({ hasText: 'Advanced Settings' });

const fieldValue = (page, fieldName: string): Promise<string> =>
  editorIn(fieldRow(page, fieldName)).evaluate((el: any) => el.CodeMirror.getValue());
const expectFieldValue = async (page, fieldName: string, expected: string) => {
  await expect.poll(() => fieldValue(page, fieldName)).toBe(expected);
};
const setField = async (page, fieldName: string, value: string) => {
  await editorIn(fieldRow(page, fieldName)).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(value);
};
const saveSettings = async (page) => {
  await page.getByRole('button', { name: 'Save' }).click();
};

const BASIC_FIELDS = ['Access Token', 'Client Token', 'Client Secret'];
const ADVANCED_FIELDS = ['Base URL', 'Nonce', 'Timestamp', 'Headers to Sign', 'Max Body Size'];

// Valid creds + simulator host so an inheriting request validates; a distinct nonce per level
// so the echoed response proves which level's auth was used.
const valuesFor = (nonce: string): Record<string, string> => ({
  'Access Token': TEST_EDGEGRID.accessToken,
  'Client Token': TEST_EDGEGRID.clientToken,
  'Client Secret': TEST_EDGEGRID.clientSecret,
  'Base URL': 'http://localhost:8081',
  'Nonce': nonce,
  'Timestamp': '20240101T00:00:00+0000',
  'Headers to Sign': 'X-Sign',
  'Max Body Size': '4096'
});

// Advanced Settings is always open, so all fields are visible without expanding.
const fillAllFields = async (page, values: Record<string, string>) => {
  for (const name of [...BASIC_FIELDS, ...ADVANCED_FIELDS]) await setField(page, name, values[name]);
};

const verifyAllFields = async (page, values: Record<string, string>) => {
  for (const name of [...BASIC_FIELDS, ...ADVANCED_FIELDS]) await expectFieldValue(page, name, values[name]);
};

const expectInheritedEdgeGridSignature = async (page, expectedNonce: string) => {
  await sendRequestAndWaitForResponse(page, 200);
  const body = await getResponseBody(page);
  expect(body).toContain(expectedNonce); // the inherited level's configured nonce was used
  expect(body).toContain('20240101T00:00:00+0000');
  expect(body).toContain('localhost:8081');
};

test.describe('Akamai EdgeGrid Authentication - collection, folder & inherit', () => {
  // Each flow fills 8 credential fields character-by-character, switches auth modes, re-verifies
  // every field, and makes real signed round-trips — more than the default 30s under parallel load.
  test.describe.configure({ timeout: 60_000 });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Collection level: renders, persists, and an inheriting request signs', async ({ page, createTmpDir }) => {
    const values = valuesFor('collection-nonce');
    await createCollection(page, 'edgegrid-collection', await createTmpDir());

    // Collection settings open automatically on creation.
    await page.locator('.tab.auth').click();
    await selectAuthMode(page, 'Akamai EdgeGrid');

    await test.step('EdgeGrid renders without crashing (regression: null edgegrid)', async () => {
      for (const name of BASIC_FIELDS) await expect(label(page, name)).toBeVisible();
      await expect(advancedHeader(page)).toBeVisible();
    });

    await test.step('Fill all fields and save', async () => {
      await fillAllFields(page, values);
      await saveSettings(page);
    });

    await test.step('Switching away and back restores the saved EdgeGrid credentials', async () => {
      await selectAuthMode(page, 'Basic Auth');
      await selectAuthMode(page, 'Akamai EdgeGrid');
      await verifyAllFields(page, values);
    });

    await test.step('A request set to Inherit shows + signs with the collection EdgeGrid auth', async () => {
      await createRequest(page, 'inherit-request', 'edgegrid-collection', { url: SIMULATOR_URL });
      await openRequest(page, 'edgegrid-collection', 'inherit-request');
      await selectRequestPaneTab(page, 'Auth');
      await selectAuthMode(page, 'Inherit');

      await expect(page.locator('.inherit-mode-text')).toHaveText('Akamai EdgeGrid');
      await expectInheritedEdgeGridSignature(page, 'collection-nonce');
    });
  });

  test('Folder level: renders, persists, and an inheriting request signs', async ({ page, createTmpDir }) => {
    const values = valuesFor('folder-nonce');
    await createCollection(page, 'edgegrid-collection', await createTmpDir());
    await createFolder(page, 'folder-1', 'edgegrid-collection', true);

    await page.locator('.collection-item-name').filter({ hasText: 'folder-1' }).dblclick();
    await page.locator('.tab.auth').click();
    await selectAuthMode(page, 'Akamai EdgeGrid');

    await test.step('EdgeGrid renders at folder level', async () => {
      for (const name of BASIC_FIELDS) await expect(label(page, name)).toBeVisible();
      await expect(advancedHeader(page)).toBeVisible();
    });

    await test.step('Fill all fields and save', async () => {
      await fillAllFields(page, values);
      await saveSettings(page);
    });

    await test.step('Switching away and back restores the saved folder EdgeGrid credentials', async () => {
      await selectAuthMode(page, 'Basic Auth');
      await selectAuthMode(page, 'Akamai EdgeGrid');
      await verifyAllFields(page, values);
    });

    await test.step('A request inside the folder set to Inherit signs with the folder EdgeGrid auth', async () => {
      await createRequest(page, 'folder-inherit-request', 'folder-1', { url: SIMULATOR_URL, inFolder: true });
      await openFolderRequest(page, 'edgegrid-collection', 'folder-1', 'folder-inherit-request');
      await selectRequestPaneTab(page, 'Auth');
      await selectAuthMode(page, 'Inherit');

      await expect(page.locator('.inherit-mode-text')).toHaveText('Akamai EdgeGrid');
      await expectInheritedEdgeGridSignature(page, 'folder-nonce');
    });
  });
});
