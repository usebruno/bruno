import { expect, Page, test } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closeGenerateCodeDialog,
  createCollection,
  createRequest,
  getGeneratedSnippet,
  openRequest,
  saveRequest,
  selectAuthMode,
  selectRequestPaneTab,
  typeIntoField
} from '../../utils/page';

/**
 * Generate Code for Akamai EdgeGrid. The snippet must carry a real EG1-HMAC-SHA256
 * `Authorization` header - computed at codegen time (bruno-common signs the HAR) - for both
 * request-level and inherited auth. When a credential is an unresolved `{{var}}`, no real
 * signature can be produced, so a placeholder stands in.
 */

const { TEST_EDGEGRID } = require('../../../packages/bruno-tests/src/auth/edgegrid');
const REQUEST_URL = 'http://localhost:8081/api/auth/edgegrid/resource';

// The credential tokens are embedded verbatim in the header; asserting the prefix proves both
// tokens made it in, in the right order.
const authHeaderPrefix = `EG1-HMAC-SHA256 client_token=${TEST_EDGEGRID.clientToken};access_token=${TEST_EDGEGRID.accessToken};`;
// A real signature is base64; the placeholder is the literal sentinel below.
const SIGNATURE_PLACEHOLDER = 'signature=<computed-at-request-time>';
const realSignature = /signature=[A-Za-z0-9+/]{20,}={0,2}/;

const fillEdgeGridCredentials = async (page: Page) => {
  await typeIntoField(page, 'Access Token', TEST_EDGEGRID.accessToken);
  await typeIntoField(page, 'Client Token', TEST_EDGEGRID.clientToken);
  await typeIntoField(page, 'Client Secret', TEST_EDGEGRID.clientSecret);
};

test.describe('Akamai EdgeGrid - Generate Code', () => {
  // Configuring auth, saving, and generating a real signed snippet across several requests runs
  // longer than the default 30s under parallel load.
  test.describe.configure({ timeout: 60_000 });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('request-level auth produces a signed EG1-HMAC-SHA256 Authorization header', async ({ page, createTmpDir }) => {
    await createCollection(page, 'edgegrid-gencode-request', await createTmpDir());
    await createRequest(page, 'signed-request', 'edgegrid-gencode-request', { url: REQUEST_URL });
    await openRequest(page, 'edgegrid-gencode-request', 'signed-request');
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, 'Akamai EdgeGrid');
    await fillEdgeGridCredentials(page);
    await saveRequest(page);

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain(authHeaderPrefix);
    expect(snippet).toMatch(realSignature);
    expect(snippet).not.toContain(SIGNATURE_PLACEHOLDER);

    await closeGenerateCodeDialog(page);
  });

  test('inherited collection auth is resolved and signed in the snippet', async ({ page, createTmpDir }) => {
    const { paneTabs, settingsSaveButton, auth } = buildCommonLocators(page);
    await createCollection(page, 'edgegrid-gencode-inherit', await createTmpDir());
    // Collection settings open on creation - configure collection-level EdgeGrid auth.
    await paneTabs.collectionSettingsTab('auth').click();
    await selectAuthMode(page, 'Akamai EdgeGrid');
    await fillEdgeGridCredentials(page);
    await settingsSaveButton().click();

    await createRequest(page, 'inheriting-request', 'edgegrid-gencode-inherit', { url: REQUEST_URL });
    await openRequest(page, 'edgegrid-gencode-inherit', 'inheriting-request');
    await selectRequestPaneTab(page, 'Auth');
    // A new request already defaults to Inherit; Generate Code reads the draft and resolves
    // inheritance from the collection, so no save is needed here.
    await expect(auth.inheritedMode()).toHaveText('Akamai EdgeGrid');

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain(authHeaderPrefix);
    expect(snippet).toMatch(realSignature);
    expect(snippet).not.toContain(SIGNATURE_PLACEHOLDER);

    await closeGenerateCodeDialog(page);
  });

  test('unresolved {{variable}} credentials produce a placeholder signature', async ({ page, createTmpDir }) => {
    await createCollection(page, 'edgegrid-gencode-vars', await createTmpDir());
    await createRequest(page, 'templated-request', 'edgegrid-gencode-vars', { url: REQUEST_URL });
    await openRequest(page, 'edgegrid-gencode-vars', 'templated-request');
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, 'Akamai EdgeGrid');
    await typeIntoField(page, 'Access Token', TEST_EDGEGRID.accessToken);
    await typeIntoField(page, 'Client Token', '{{clientToken}}');
    await typeIntoField(page, 'Client Secret', '{{clientSecret}}');
    await saveRequest(page);

    const snippet = await getGeneratedSnippet(page);

    // Unresolved token stays verbatim in the header; the signature can't be computed from it.
    expect(snippet).toContain('client_token={{clientToken}}');
    expect(snippet).toContain(SIGNATURE_PLACEHOLDER);

    await closeGenerateCodeDialog(page);
  });
});
