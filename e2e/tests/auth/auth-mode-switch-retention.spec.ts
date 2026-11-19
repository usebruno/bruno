import fs from 'node:fs';
import path from 'node:path';
import { test, expect, Page } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closeRequestTabDiscardingChanges,
  createCollection,
  createFolder,
  createRequest,
  expectAuthState,
  fieldEditor,
  fillAuthFields,
  openCollectionSettings,
  openFolderSettings,
  openInheritedAuth,
  openRequest,
  readField,
  saveAuthSettings,
  saveRequest,
  selectApiKeyAuth,
  selectAuthMode,
  selectCollectionPaneTab,
  selectfolderPaneTab,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequest
} from '../../pages';
import { AUTH_MODE_LABELS } from '../../constants';

const REQUEST_URL = 'http://localhost:8081/headers';

// The mode selector labels these two modes differently from their dropdown entries.
const SELECTED_MODE_LABELS = { NTLM: 'NTLM', AWSV4: 'AWS Sig V4' };

type AuthLevel = 'request' | 'folder' | 'collection';

const readRequestFile = (collectionDir: string, requestName: string) => {
  const fileName = `${requestName}.yml`;
  const entry = (fs.readdirSync(collectionDir, { recursive: true }) as string[]).find((file) => path.basename(file) === fileName);
  if (!entry) {
    throw new Error(`${fileName} not found under ${collectionDir}`);
  }
  return fs.readFileSync(path.join(collectionDir, entry), 'utf8');
};

const openLatestTimelineEntry = async (page: Page) => {
  const { timeline } = buildCommonLocators(page);
  await selectResponsePaneTab(page, 'Timeline');
  const timelineItem = timeline.items().first();
  await timeline.itemHeader(timelineItem).click();
  return timelineItem;
};

test.describe('Auth data retention on auth mode switch', () => {
  test.setTimeout(120000);

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-2243: Authentication Data Retention Behavior Is Consistent Across Request, Folder, and Collection Levels', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'auth-retention-levels';
    const folderName = 'folder-1';
    const locators = buildCommonLocators(page);

    const save = async (level: AuthLevel) => {
      if (level === 'request') {
        await saveRequest(page);
      } else {
        await saveAuthSettings(page, level);
      }
    };

    const verifyRetention = async (level: AuthLevel, apiKey: { Key: string; Value: string }, bearerToken: string) => {
      await test.step(`${level}: configure and save API Key auth in the header`, async () => {
        await selectApiKeyAuth(page);
        await fillAuthFields(page, apiKey);
        await save(level);
        await expectAuthState(page, AUTH_MODE_LABELS.APIKEY, apiKey);
        await expect(locators.auth.apiKey.placementLabel()).toContainText('Header');
      });

      await test.step(`${level}: switch to Bearer Token without saving`, async () => {
        await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
        await expectAuthState(page, AUTH_MODE_LABELS.BEARER, { Token: '' });
      });

      await test.step(`${level}: enter a Bearer Token without saving`, async () => {
        await fillAuthFields(page, { Token: bearerToken });
      });

      await test.step(`${level}: switch back to API Key and verify the saved data is restored`, async () => {
        await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
        await expectAuthState(page, AUTH_MODE_LABELS.APIKEY, apiKey);
        await expect(locators.auth.apiKey.placementLabel()).toContainText('Header');
      });
    };

    await test.step('Create a collection with a request, a folder and an inheriting request', async () => {
      await createCollection(page, collectionName, await createTmpDir());
      await createRequest(page, 'request-1', collectionName, { url: REQUEST_URL });
      await createRequest(page, 'inherit-request', collectionName, { url: REQUEST_URL });
      await createFolder(page, folderName, collectionName, true);
    });

    await test.step('Request level', async () => {
      await openRequest(page, collectionName, 'request-1');
      await selectRequestPaneTab(page, 'Auth');
      await verifyRetention('request', { Key: 'api_key', Value: 'test_key_123' }, 'bearer_token_456');
    });

    await test.step('Folder level', async () => {
      await openFolderSettings(page, collectionName, folderName);
      await selectfolderPaneTab(page, 'auth');
      await verifyRetention('folder', { Key: 'folder_api_key', Value: 'folder_key_123' }, 'folder_bearer_456');
    });

    await test.step('Collection level', async () => {
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'auth');
      await verifyRetention('collection', { Key: 'collection_api_key', Value: 'collection_key_123' }, 'collection_bearer_456');
    });

    await test.step('A request inheriting from the collection shows the collection API Key auth', async () => {
      await openInheritedAuth(page, collectionName, 'inherit-request', AUTH_MODE_LABELS.APIKEY);
      await expect(locators.auth.modeSelector()).toContainText(AUTH_MODE_LABELS.INHERIT);
      await expect(locators.auth.inheritedSource('Collection')).toBeVisible();
      await expect.poll(() => readField(page, 'Key')).toBe('collection_api_key');
      await expect.poll(() => readField(page, 'Value')).toBe('collection_key_123');
    });

    await test.step('The inheriting request sends the collection API Key header', async () => {
      await sendRequest(page, 200);
      const timelineItem = await openLatestTimelineEntry(page);
      await expect(locators.timeline.headerValue(timelineItem, 'collection_api_key')).toHaveText('collection_key_123');
    });
  });

  test('TC-2244: Switching Between Multiple Auth Types in Sequence Retains Last Saved Auth Data', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'auth-retention-sequence';
    const requestName = 'request-1';
    const savedApiKey = { Key: 'api_key', Value: 'key_value_1' };
    const locators = buildCommonLocators(page);

    await createCollection(page, collectionName, await createTmpDir());
    await createRequest(page, requestName, collectionName, { url: REQUEST_URL });
    await openRequest(page, collectionName, requestName);
    await selectRequestPaneTab(page, 'Auth');

    await test.step('Step 1: configure and save API Key auth in the header', async () => {
      await selectApiKeyAuth(page);
      await fillAuthFields(page, savedApiKey);
      await saveRequest(page);
      await expectAuthState(page, AUTH_MODE_LABELS.APIKEY, savedApiKey);
      await expect(locators.auth.apiKey.placementLabel()).toContainText('Header');
    });

    await test.step('Step 2: switch to Bearer Token and enter a token without saving', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
      await fillAuthFields(page, { Token: 'token_value_1' });
      await expectAuthState(page, AUTH_MODE_LABELS.BEARER, { Token: 'token_value_1' });
      await expect(locators.tabs.draftIndicator(), 'the switch is not auto-saved').toBeVisible();
    });

    await test.step('Step 3: switch to Basic Auth — fields start empty', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.BASIC);
      await expectAuthState(page, AUTH_MODE_LABELS.BASIC, { Username: '', Password: '' });
    });

    await test.step('Step 4: enter Basic Auth credentials without saving', async () => {
      await fillAuthFields(page, { Username: 'user_name', Password: 'pass_123' });
    });

    await test.step('Step 5: switch back to API Key — the saved key/value is restored', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
      await expectAuthState(page, AUTH_MODE_LABELS.APIKEY, savedApiKey);
    });

    await test.step('Step 6: switch to Digest Auth and enter values without saving', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.DIGEST);
      await expectAuthState(page, AUTH_MODE_LABELS.DIGEST, { Username: '', Password: '' });
      await fillAuthFields(page, { Username: 'digest_user', Password: 'digest_pass' });
    });

    await test.step('Step 7: switch to NTLM Auth — the unsaved Digest values are not carried over', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.NTLM);
      await expectAuthState(page, SELECTED_MODE_LABELS.NTLM, { Username: '', Password: '', Domain: '' });
    });

    await test.step('Step 8: switch to AWS Sig v4 and enter an access key without saving', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.AWSV4);
      await fillAuthFields(page, { 'Access Key ID': 'access_key_xyz' });
      await expectAuthState(page, SELECTED_MODE_LABELS.AWSV4, { 'Access Key ID': 'access_key_xyz' });
    });

    await test.step('Step 9: switch to WSSE Auth — fields start empty', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.WSSE);
      await expectAuthState(page, AUTH_MODE_LABELS.WSSE, { Username: '', Password: '' });
    });

    await test.step('Step 10: switch to No Auth, then back to API Key — the saved key/value is restored', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.NONE);
      await expectAuthState(page, AUTH_MODE_LABELS.NONE);

      await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
      await expectAuthState(page, AUTH_MODE_LABELS.APIKEY, savedApiKey);
      await expect(locators.tabs.draftIndicator(), 'nothing left to save').toBeHidden();
    });

    await test.step('Step 11: switch to Bearer Token and save a new token', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
      await expectAuthState(page, AUTH_MODE_LABELS.BEARER, { Token: '' });
      await fillAuthFields(page, { Token: 'new_bearer_token' });
      await saveRequest(page);
      await expectAuthState(page, AUTH_MODE_LABELS.BEARER, { Token: 'new_bearer_token' });
      await expect(locators.tabs.draftIndicator()).toBeHidden();
    });

    await test.step('Step 12: Bearer Token is now the last saved auth — it survives a switch to API Key and back', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
      await expectAuthState(page, AUTH_MODE_LABELS.APIKEY, { Key: '', Value: '' });

      await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
      await expectAuthState(page, AUTH_MODE_LABELS.BEARER, { Token: 'new_bearer_token' });
    });
  });

  test('TC-2242: Cancelling Auth Type Switch Restores Previously Configured Authentication Data Fully', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'auth-retention-cancel';
    const requestName = 'request-1';
    const savedBasic = { Username: 'user1', Password: 'pass1' };
    const locators = buildCommonLocators(page);

    await test.step('Precondition: a request saved with Basic Auth', async () => {
      await createCollection(page, collectionName, await createTmpDir());
      await createRequest(page, requestName, collectionName, { url: REQUEST_URL });
      await openRequest(page, collectionName, requestName);
      await selectRequestPaneTab(page, 'Auth');
      await selectAuthMode(page, AUTH_MODE_LABELS.BASIC);
      await fillAuthFields(page, savedBasic);
      await saveRequest(page);
    });

    await test.step('The Auth tab shows the saved Basic Auth data', async () => {
      await expectAuthState(page, AUTH_MODE_LABELS.BASIC, savedBasic);
    });

    await test.step('Switch to API Key — the Basic Auth fields are replaced by empty API Key fields', async () => {
      await selectApiKeyAuth(page);
      await expectAuthState(page, AUTH_MODE_LABELS.APIKEY, { Key: '', Value: '' });
    });

    await test.step('Enter only the key name, leaving the value empty', async () => {
      await fillAuthFields(page, { Key: 'api_key' });
      await expect(locators.tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Navigate away by closing the tab and discarding the changes', async () => {
      await closeRequestTabDiscardingChanges(page, requestName);
    });

    await test.step('Reopen the request — Basic Auth is fully restored', async () => {
      await openRequest(page, collectionName, requestName);
      await selectRequestPaneTab(page, 'Auth');
      await expectAuthState(page, AUTH_MODE_LABELS.BASIC, savedBasic);
      await expect(locators.tabs.draftIndicator()).toBeHidden();
    });

    await test.step('Send the request — it carries the original Basic Auth credentials', async () => {
      await sendRequest(page, 200);
      const timelineItem = await openLatestTimelineEntry(page);
      const expectedHeader = `Basic ${Buffer.from('user1:pass1').toString('base64')}`;
      await expect(locators.timeline.headerValue(timelineItem, 'Authorization')).toHaveText(expectedHeader);
      await expect(locators.timeline.headerRow(timelineItem, 'api_key')).toHaveCount(0);
    });
  });

  test('TC-2241: Switching from Any Auth Type to No Auth Retains Previous Auth Data Until Save Is Confirmed', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'auth-retention-no-auth';
    const requestName = 'request-1';
    const bearerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const collectionDir = await createTmpDir();
    const locators = buildCommonLocators(page);

    await test.step('Precondition: a request saved with Bearer Token auth', async () => {
      await createCollection(page, collectionName, collectionDir);
      await createRequest(page, requestName, collectionName, { url: REQUEST_URL });
      await openRequest(page, collectionName, requestName);
      await selectRequestPaneTab(page, 'Auth');
      await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
      await fillAuthFields(page, { Token: bearerToken });
      await saveRequest(page);
    });

    await test.step('The Auth tab shows the saved Bearer Token', async () => {
      await expectAuthState(page, AUTH_MODE_LABELS.BEARER, { Token: bearerToken });
    });

    await test.step('Select No Auth — no auth fields are shown', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.NONE);
      await expectAuthState(page, AUTH_MODE_LABELS.NONE);
      await expect(fieldEditor(page, 'Token')).toHaveCount(0);
    });

    await test.step('The Bearer Token is retained until the switch is saved', async () => {
      await expect(locators.tabs.draftIndicator()).toBeVisible();
      expect(readRequestFile(collectionDir, requestName)).toContain(bearerToken);
    });

    await test.step('The Save button is available', async () => {
      await expect(locators.saveButton()).toBeVisible();
      await expect(locators.saveButton()).toBeEnabled();
    });

    await test.step('Save the No Auth selection', async () => {
      await locators.saveButton().click();
      await expect(locators.toast.byMessage('Request saved successfully').last()).toBeVisible();
      await expectAuthState(page, AUTH_MODE_LABELS.NONE);
      await expect(locators.tabs.draftIndicator()).toBeHidden();
      await expect.poll(() => readRequestFile(collectionDir, requestName)).not.toContain(bearerToken);
    });

    await test.step('Send the request — no Authorization header is sent', async () => {
      await sendRequest(page, 200);
      const timelineItem = await openLatestTimelineEntry(page);
      await expect(locators.timeline.headerRow(timelineItem, 'Host')).toHaveCount(1);
      await expect(locators.timeline.headerRow(timelineItem, 'Authorization')).toHaveCount(0);
    });
  });
});
