import { expect, test } from '../../../playwright';
import {
  addEnvironmentVariable,
  buildCommonLocators,
  closeAllCollections,
  closeAllTabs,
  createCollection,
  createEnvironment,
  createRequest,
  getResponseBody,
  openRequest,
  saveEnvironment,
  saveRequest,
  selectEnvironment,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequestAndWaitForResponse
} from '../../utils/page';

// Shared test creds - the local simulator (packages/bruno-tests/src/auth/edgegrid.js) knows
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
  // Each flow fills 8 credential fields character-by-character, saves, re-verifies every field, and
  // makes real signed round-trips to the simulator — more than the default 30s under parallel load.
  test.describe.configure({ timeout: 60_000 });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Configure, sign against the simulator, and persist all fields', async ({ page, createTmpDir }) => {
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

    await test.step('Send the request - simulator validates and echoes the configured values', async () => {
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

    await test.step('Send request - simulator echoes the auto-generated defaults', async () => {
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

  test('Timeline network log shows resolved variables, nonce, timestamp, and signature of a sent request', async ({ page, createTmpDir }) => {
    const { timeline } = buildCommonLocators(page);
    const nonce = 'timeline-nonce';
    const timestamp = '20240101T00:00:00+0000';

    await createCollection(page, 'edgegrid-timeline-test', await createTmpDir());

    await test.step('Define every credential as an environment variable', async () => {
      await createEnvironment(page, 'Local');
      await addEnvironmentVariable(page, { name: 'egAccessToken', value: TEST_EDGEGRID.accessToken });
      await addEnvironmentVariable(page, { name: 'egClientToken', value: TEST_EDGEGRID.clientToken });
      await addEnvironmentVariable(page, { name: 'egClientSecret', value: TEST_EDGEGRID.clientSecret });
      await saveEnvironment(page);
    });

    await test.step('Configure EdgeGrid auth with all credentials sourced from variables', async () => {
      await createRequest(page, 'edgegrid-timeline-request', 'edgegrid-timeline-test', { url: SIMULATOR_URL });
      await openRequest(page, 'edgegrid-timeline-test', 'edgegrid-timeline-request');
      await selectRequestPaneTab(page, 'Auth');
      await selectEdgeGridMode(page);
      await setField(page, 'Access Token', '{{egAccessToken}}');
      await setField(page, 'Client Token', '{{egClientToken}}');
      await setField(page, 'Client Secret', '{{egClientSecret}}');
      await setField(page, 'Nonce', nonce);
      await setField(page, 'Timestamp', timestamp);
      await saveRequest(page);
    });

    await test.step('Send against the simulator (validates the signature)', async () => {
      await selectEnvironment(page, 'Local');
      await sendRequestAndWaitForResponse(page, 200);
    });

    await test.step('Timeline → Network shows the signed header exactly as sent on the wire', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      const entry = timeline.items().first();
      await timeline.itemHeader(entry).click();
      await timeline.networkButton(entry).click();
      const networkLogs = timeline.networkLogs(entry);

      // Credentials were interpolated from the variables before signing - no unresolved tokens.
      await expect(networkLogs).toContainText(`access_token=${TEST_EDGEGRID.accessToken}`);
      await expect(networkLogs).toContainText(`client_token=${TEST_EDGEGRID.clientToken}`);
      await expect(networkLogs).not.toContainText('{{');
      // The EG1-HMAC-SHA256 header carries the configured nonce/timestamp and a computed signature
      // (the 200 above already proves the resolved clientSecret produced a valid signature).
      await expect(networkLogs).toContainText(`nonce=${nonce}`);
      await expect(networkLogs).toContainText(`timestamp=${timestamp}`);
      await expect(networkLogs).toContainText('signature=');
    });
  });
});
