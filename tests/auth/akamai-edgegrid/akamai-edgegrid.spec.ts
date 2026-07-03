import { expect, test } from '../../../playwright';
import {
  closeAllCollections,
  closeAllTabs,
  createCollection,
  createRequest,
  getResponseBody,
  openRequest,
  saveRequest,
  selectRequestPaneTab,
  sendRequestAndWaitForResponse
} from '../../utils/page';

// Shared test creds — the local simulator (packages/bruno-tests/src/auth/edgegrid.js) knows
// this secret, so signed requests validate (200) and the response echoes the effective values.
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

// Select-all then type so it works for empty fields and the prefilled Base URL alike.
const setField = async (page, fieldName: string, value: string) => {
  await editorIn(fieldRow(page, fieldName)).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(value);
};

const selectEdgeGridMode = async (page) => {
  await page.locator('.auth-mode-label').click();
  await page.locator('.dropdown-item').filter({ hasText: 'Akamai EdgeGrid' }).click();
};

const BASIC_FIELDS = ['Access Token', 'Client Token', 'Client Secret'];
const ADVANCED_FIELDS = ['Base URL', 'Nonce', 'Timestamp', 'Headers to Sign', 'Max Body Size'];

// Exact values for the configure → save → send → persist round-trip. Base URL is the simulator
// host (so the signature validates), and a fixed nonce/timestamp so we can assert the echo.
const VALUES: Record<string, string> = {
  'Access Token': TEST_EDGEGRID.accessToken,
  'Client Token': TEST_EDGEGRID.clientToken,
  'Client Secret': TEST_EDGEGRID.clientSecret,
  'Base URL': 'http://localhost:8081',
  'Nonce': 'ui-nonce-123',
  'Timestamp': '20240101T00:00:00+0000',
  'Headers to Sign': 'X-Sign-A',
  'Max Body Size': '4096'
};

test.describe('Akamai EdgeGrid Authentication (request level)', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Configure, sign against the simulator, and persist all fields', async ({ page, createTmpDir }) => {
    test.setTimeout(90_000);

    await createCollection(page, 'edgegrid-ui-test', await createTmpDir());
    await createRequest(page, 'edgegrid-request', 'edgegrid-ui-test', { url: SIMULATOR_URL });
    await openRequest(page, 'edgegrid-ui-test', 'edgegrid-request');
    await selectRequestPaneTab(page, 'Auth');
    await selectEdgeGridMode(page);

    await test.step('Basic fields render after selecting EdgeGrid (regression: request-level render)', async () => {
      for (const name of BASIC_FIELDS) {
        await expect(label(page, name)).toBeVisible();
      }
      await expect(advancedHeader(page)).toBeVisible();
    });

    await test.step('Base URL editor prefills with the request URL when empty', async () => {
      await expectFieldValue(page, 'Base URL', SIMULATOR_URL);
    });

    await test.step('Fill all basic + advanced fields and save', async () => {
      for (const name of BASIC_FIELDS) await setField(page, name, VALUES[name]);
      for (const name of ADVANCED_FIELDS) await setField(page, name, VALUES[name]);
      await saveRequest(page);
    });

    await test.step('Send the request — simulator validates and echoes the configured values', async () => {
      await sendRequestAndWaitForResponse(page, 200);
      const body = await getResponseBody(page);
      expect(body).toContain('ui-nonce-123'); // configured nonce was signed & sent
      expect(body).toContain('20240101T00:00:00+0000'); // configured timestamp
      expect(body).toContain('localhost:8081'); // base_url host the signature validated against
    });

    await test.step('All fields persist across reopen (regression: draft-path save)', async () => {
      await closeAllTabs(page);
      await openRequest(page, 'edgegrid-ui-test', 'edgegrid-request');
      await selectRequestPaneTab(page, 'Auth');
      for (const name of BASIC_FIELDS) await expectFieldValue(page, name, VALUES[name]);
      for (const name of ADVANCED_FIELDS) await expectFieldValue(page, name, VALUES[name]);
    });
  });

  test('Empty Advanced Settings fall back to auto-generated defaults', async ({ page, createTmpDir }) => {
    test.setTimeout(90_000);

    await createCollection(page, 'edgegrid-defaults-test', await createTmpDir());
    await createRequest(page, 'edgegrid-defaults', 'edgegrid-defaults-test', { url: SIMULATOR_URL });
    await openRequest(page, 'edgegrid-defaults-test', 'edgegrid-defaults');
    await selectRequestPaneTab(page, 'Auth');
    await selectEdgeGridMode(page);

    await test.step('Fill only the required credentials, leave Advanced Settings empty', async () => {
      await setField(page, 'Access Token', TEST_EDGEGRID.accessToken);
      await setField(page, 'Client Token', TEST_EDGEGRID.clientToken);
      await setField(page, 'Client Secret', TEST_EDGEGRID.clientSecret);
      await saveRequest(page);
    });

    await test.step('Send request — simulator echoes the auto-generated defaults', async () => {
      await sendRequestAndWaitForResponse(page, 200);
      const body = await getResponseBody(page);
      // nonce auto-generated as a UUID v4
      expect(body).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
      // timestamp auto-generated in EdgeGrid format YYYYMMDDTHH:MM:SS+0000
      expect(body).toMatch(/\d{8}T\d{2}:\d{2}:\d{2}\+0000/);
      // base_url defaulted to the request host
      expect(body).toContain('localhost:8081');
      // max_body_size defaulted to 131072
      expect(body).toContain('131072');
    });
  });
});
