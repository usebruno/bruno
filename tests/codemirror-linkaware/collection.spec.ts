import { Page, test } from '../../playwright';
import { buildCommonLocators, closeAllCollections, closeAllTabs, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, expectLinkOpensRequest, openCollectionFromDialog, openRequest } from '../utils/page';

const settings = (page: Page) => buildCommonLocators(page).paneTabs.collectionSettingsContent();
const url = (path: string) => `http://link-aware.test/${path}`;

const openCollectionSettingsTab = async (page: Page, key: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection(COLLECTION_NAME).hover();
  await locators.actions.collectionActions(COLLECTION_NAME).click();
  await locators.dropdown.item('Settings').click();
  await locators.paneTabs.collectionSettingsTab(key).click();
};

test.describe('CodeMirror link-aware — Collection settings', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    // Opening a request first is the concrete "collection fully loaded" signal (same
    // watcher scan that parses collection.bru's headers/auth/vars/script/tests) —
    // otherwise Settings can race ahead of collection.root being populated.
    await openRequest(page, COLLECTION_NAME, 'http-request');
    await closeAllTabs(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Vars: plain click creates a transient request', async ({ page }) => {
    await openCollectionSettingsTab(page, 'vars');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(settings(page));
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('collection-vars') });
  });

  test('Pre-Request-Script: plain click creates a transient request', async ({ page }) => {
    const locators = buildCommonLocators(page);
    await openCollectionSettingsTab(page, 'script');
    await locators.paneTabs.tabTrigger('pre-request').click();
    const cm = locators.codeMirror.byTestId('collection-pre-request-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('collection-script') });
  });

  test('Post-Response-Script: plain click creates a transient request', async ({ page }) => {
    const locators = buildCommonLocators(page);
    await openCollectionSettingsTab(page, 'script');
    await locators.paneTabs.tabTrigger('post-response').click();
    const cm = locators.codeMirror.byTestId('collection-post-response-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('collection-script') });
  });

  test('Tests: plain click creates a transient request', async ({ page }) => {
    await openCollectionSettingsTab(page, 'tests');
    const cm = buildCommonLocators(page).codeMirror.within(settings(page));
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('collection-tests') });
  });

  const presets: Array<{ radio: string; type: 'http' | 'graphql' | 'grpc' | 'ws' }> = [
    { radio: 'http', type: 'http' },
    { radio: 'graphql', type: 'graphql' },
    { radio: 'grpc', type: 'grpc' },
    { radio: 'ws', type: 'ws' }
  ];

  for (const { radio, type } of presets) {
    test(`Presets = ${radio}: Vars link resolves to a transient ${type} request`, async ({ page }) => {
      await openCollectionSettingsTab(page, 'presets');
      await buildCommonLocators(page).presets.requestType(type).check();
      await openCollectionSettingsTab(page, 'vars');
      const cm = buildCommonLocators(page).codeMirror.valueCellAt(settings(page));
      await expectLinkOpensRequest(page, cm, { type, url: url('collection-vars') });
    });
  }

  test('Presets never configured: Vars link defaults to a transient HTTP request', async ({ page }) => {
    // Fixture's bruno.json already sets presets.requestType to "http" — this is the default
    // path (getRequestTypeFromCollectionPresets() falls back to 'http-request' either way).
    await openCollectionSettingsTab(page, 'vars');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(settings(page));
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('collection-vars') });
  });
});
