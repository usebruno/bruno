import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections, openCollection, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

/**
 * Imports the real Postman EdgeGrid collection and asserts every credential value lands in the
 * right SingleLineEditor at every level (collection settings, request level, inherit). Expected
 * values are read straight from the fixture JSON so assertions can never drift from the source.
 *
 * Locators are scoped to the VISIBLE pane: when the collection-settings tab and a request tab
 * are both open, the field labels/editors exist twice in the DOM (one hidden), so we must only
 * read the active pane.
 */

const FIXTURE = path.resolve(__dirname, 'fixtures', 'postman-edgegrid-collection.json');
const COLLECTION_NAME = 'EgdeGrid Auth';
const REQUEST_LEVEL = 'Edgegrid auth -  request level';
const INHERIT_REQUEST = 'Edgegrid Auth - inherit';

// UI label → Postman/Bruno camelCase key (1:1). Order = display order (3 basic, then advanced).
const FIELDS: Array<{ label: string; key: string; advanced?: boolean }> = [
  { label: 'Access Token', key: 'accessToken' },
  { label: 'Client Token', key: 'clientToken' },
  { label: 'Client Secret', key: 'clientSecret' },
  { label: 'Base URL', key: 'baseURL', advanced: true },
  { label: 'Nonce', key: 'nonce', advanced: true },
  { label: 'Timestamp', key: 'timestamp', advanced: true },
  { label: 'Headers to Sign', key: 'headersToSign', advanced: true },
  { label: 'Max Body Size', key: 'maxBodySize', advanced: true }
];

// Flatten a Postman edgegrid auth array ([{key,value}]) into { key: stringValue }.
const egMap = (arr: any[] = []): Record<string, string> =>
  Object.fromEntries((arr || []).map((p) => [p.key, p.value == null ? '' : String(p.value)]));

const pm = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const collectionExpected = egMap(pm.auth?.edgegrid);
const requestExpected = egMap(pm.item.find((i: any) => i.name === REQUEST_LEVEL)?.request?.auth?.edgegrid);

// The exact key/value pairs the fixture is expected to carry. Asserting the parsed maps equal
// these (below) guarantees the UI value checks are matching against real, exact values — not
// silently degenerating to '' === '' if the fixture/mapping ever changes.
const EXPECTED_COLLECTION = {
  accessToken: 'akab-acc35t0k3nodujqunph3w7hzp7-gtm6ij',
  clientToken: 'akab-c113ntt0k3n4qtari252bfxxbsl-yvsdj',
  clientSecret: 'C113nt53KR3TN6N90yVuAgICxIRwsObLi0E67/N8eRN=',
  nonce: 'ec9d20ee-1e9b-4c1f-925a-f0017754f86c',
  timestamp: '20160804T07:00:00+0000',
  baseURL: 'https://akab-h05tnam3wl42son7nktnlnnx-kbob3i3v.luna.akamaiapis.net',
  maxBodySize: '131072'
};
const EXPECTED_REQUEST = {
  accessToken: 'akab-acc35t0k3nodujqunph3w7hzp7-request',
  clientToken: 'akab-c113ntt0k3n4qtari252bfxxbsl-request',
  clientSecret: 'C113nt53KR3TN6N90yVuAgICxIRwsObLi0E67/request=',
  nonce: 'ec9d20ee-1e9b-4c1f-925a-request',
  timestamp: '20160804T07:00:00+0000',
  baseURL: 'https://akab-h05tnam3wl42son7nktnlnnx-kbob3i3v.luna.akamaiapis.request.net',
  maxBodySize: '131072'
};

// --- visible-scoped locators (active pane only) ---
const visible = (loc) => loc.filter({ visible: true });
const visibleLabel = (page, labelText: string) => visible(page.locator('label').filter({ hasText: labelText }));
const visibleAuthModeLabel = (page) => visible(page.locator('.auth-mode-label'));

const fieldEditorValue = (page, labelText: string): Promise<string> =>
  visibleLabel(page, labelText)
    .locator('..')
    .locator('.single-line-editor-wrapper .CodeMirror')
    .evaluate((el: any) => el.CodeMirror.getValue());

// Assert mode = EdgeGrid and EVERY field's editor value matches the expected JSON value.
const assertEdgeGridValues = async (page, expected: Record<string, string>) => {
  await expect(visibleAuthModeLabel(page)).toHaveText(/Akamai EdgeGrid/);

  // Advanced Settings is always open, so all fields are visible — assert them all.
  for (const f of FIELDS) {
    await expect.poll(() => fieldEditorValue(page, f.label), { message: `${f.label} (${f.key})` }).toBe(
      expected[f.key] ?? ''
    );
  }
};

test.describe('Import Postman Collection with Akamai EdgeGrid auth', () => {
  let originalShowOpenDialog;

  test.beforeAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      originalShowOpenDialog = dialog.showOpenDialog;
    });
    // Pin the fixture to the exact key/value pairs we assert in the UI (exact, not a count).
    expect(collectionExpected).toEqual(EXPECTED_COLLECTION);
    expect(requestExpected).toEqual(EXPECTED_REQUEST);
  });

  test.afterAll(async ({ electronApp, page }) => {
    await closeAllCollections(page);
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = originalShowOpenDialog;
    });
  });

  test('imports EdgeGrid auth with exact values at collection, request and inherit levels', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    test.setTimeout(120_000);
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('imported-edgegrid');

    await electronApp.evaluate(({ dialog }, { importDir }) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [importDir] });
    }, { importDir });

    await test.step('Import the Postman collection', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      await locators.import.fileInput().setInputFiles(FIXTURE);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });

      const hasError = await locators.import.parsingError().isVisible().catch(() => false);
      expect(hasError).toBeFalsy();

      await expect(locators.import.locationModal().getByText(COLLECTION_NAME)).toBeVisible();
      await locators.import.browseLink(locators.import.locationModal()).click();
      const locationModal = locators.import.locationModal();
      await locators.import.importButton(locationModal).click();
      await locationModal.waitFor({ state: 'hidden' });
    });

    await openCollection(page, COLLECTION_NAME);

    await test.step('Collection-level: every EdgeGrid field value matches the JSON', async () => {
      await locators.actions.collectionActions(COLLECTION_NAME).click();
      await locators.dropdown.item('Settings').click();
      await page.getByTestId('collection-settings-tab-auth').click();
      await assertEdgeGridValues(page, collectionExpected);
    });

    await test.step('Request-level ("Edgegrid auth - request level"): every field value matches the JSON', async () => {
      await locators.sidebar.request(REQUEST_LEVEL).click();
      await selectRequestPaneTab(page, 'Auth');
      await assertEdgeGridValues(page, requestExpected);
    });

    await test.step('Inherit request inherits EdgeGrid from the collection', async () => {
      await locators.sidebar.request(INHERIT_REQUEST).click();
      await selectRequestPaneTab(page, 'Auth');
      await expect(visibleAuthModeLabel(page)).toHaveText(/Inherit/);
      await expect(visible(page.locator('.inherit-mode-text'))).toHaveText('Akamai EdgeGrid');
    });
  });
});
