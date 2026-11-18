import { test, expect, Locator, Page } from '../../../playwright';
import {
  API_KEY_PLACEMENT_LABELS,
  AUTH_MODE_IDS,
  SELECTED_AUTH_MODE_LABELS as AUTH_LABELS,
  type ApiKeyPlacement
} from '../../utils/constants/auth';
import { collectionName, credentials, echoPath, folderName, requests } from '../../utils/constants/auth-retention';
import {
  type AuthField,
  buildCommonLocators,
  discardRequestDraft,
  editAuthField,
  openCollectionAuth,
  openFolderAuth,
  openRequestAuth,
  pressSaveShortcut,
  readEditorValue,
  selectApiKeyPlacement,
  selectAuthModeById,
  setRequestUrl
} from '../../utils/page';

const { apiKey, basic, bearer, digest, awsAccessKeyId } = credentials;
const echoResponseTimeout = 15_000;

test.describe.configure({ timeout: 60_000 });

type AuthLocators = ReturnType<typeof buildCommonLocators>['auth'];

async function expectApiKeyFields(auth: AuthLocators, value: string, placement: ApiKeyPlacement = 'header') {
  await expect.poll(() => readEditorValue(auth.field('apikey-key'))).toBe(apiKey.key);
  await expect.poll(() => readEditorValue(auth.field('apikey-value'))).toBe(value);
  await expect(auth.apiKey.placementLabel()).toHaveText(API_KEY_PLACEMENT_LABELS[placement]);
}

async function configureApiKey(page: Page, value: string) {
  await selectAuthModeById(page, AUTH_MODE_IDS.APIKEY);
  await editAuthField(page, 'apikey-key', apiKey.key);
  await editAuthField(page, 'apikey-value', value);
}

async function readEchoedHeaders(preview: Locator) {
  const body = await readEditorValue(preview);
  return body ? (JSON.parse(body) as { headers: Record<string, string> }).headers : undefined;
}

async function saveRequestDraft(page: Page, draftIcon: Locator) {
  await expect(draftIcon).toHaveAttribute('data-has-draft', 'true');
  await pressSaveShortcut(page);
  await expect(draftIcon).toHaveAttribute('data-has-draft', 'false');
}

test('TC-2241: retains saved Bearer auth until No Auth is saved', { tag: '@sanity' }, async ({
  pageWithUserData: page, baseURL
}) => {
  const { auth, request, response, tabs } = buildCommonLocators(page);
  const draftIcon = tabs.requestTabDraftIcon(tabs.requestTabByName(requests.noAuth));
  const responseEditor = response.previewContainerCodeMirror();

  await test.step('Save Bearer auth and verify it is sent to the echo endpoint', async () => {
    await openRequestAuth(page, collectionName, requests.noAuth);
    await setRequestUrl(page, new URL(echoPath, baseURL).href);
    await selectAuthModeById(page, AUTH_MODE_IDS.BEARER);
    await editAuthField(page, 'bearer-token', bearer.saved);
    await saveRequestDraft(page, draftIcon);
    await request.sendButton().click();

    await expect(responseEditor).toBeVisible({ timeout: echoResponseTimeout });
    await expect.poll(() => readEchoedHeaders(responseEditor))
      .toHaveProperty('authorization', `Bearer ${bearer.saved}`);
  });

  await test.step('Switch to No Auth and back without saving', async () => {
    await selectAuthModeById(page, AUTH_MODE_IDS.NONE);
    await expect(auth.modeLabel()).toHaveText(AUTH_LABELS.NONE);
    await expect(auth.field('bearer-token')).toHaveCount(0);
    await expect(request.saveButton()).toBeVisible();
    await expect(draftIcon).toHaveAttribute('data-has-draft', 'true');

    await selectAuthModeById(page, AUTH_MODE_IDS.BEARER);
    await expect.poll(() => readEditorValue(auth.field('bearer-token'))).toBe(bearer.saved);
  });

  await test.step('Save No Auth and verify the next request omits Authorization', async () => {
    await selectAuthModeById(page, AUTH_MODE_IDS.NONE);
    await saveRequestDraft(page, draftIcon);
    await request.sendButton().click();

    await expect(auth.modeLabel()).toHaveText(AUTH_LABELS.NONE);
    await expect.poll(async () => {
      const headers = await readEchoedHeaders(responseEditor);
      return headers !== undefined && !('authorization' in headers);
    }, { timeout: echoResponseTimeout }).toBe(true);
  });
});

test('TC-2242: discards an incomplete API key draft and restores saved Basic auth', { tag: '@sanity' }, async ({
  pageWithUserData: page, baseURL
}) => {
  const { auth, request, response, tabs } = buildCommonLocators(page);
  const draftIcon = tabs.requestTabDraftIcon(tabs.requestTabByName(requests.discard));
  const responseEditor = response.previewContainerCodeMirror();

  await test.step('Save Basic auth on the request', async () => {
    await openRequestAuth(page, collectionName, requests.discard);
    await setRequestUrl(page, new URL(echoPath, baseURL).href);
    await selectAuthModeById(page, AUTH_MODE_IDS.BASIC);
    await editAuthField(page, 'basic-username', basic.username);
    await editAuthField(page, 'basic-password', basic.password);
    await saveRequestDraft(page, draftIcon);
  });

  await test.step('Enter a partial API key and close without saving', async () => {
    await selectAuthModeById(page, AUTH_MODE_IDS.APIKEY);
    await editAuthField(page, 'apikey-key', apiKey.partialKey);

    await expect(auth.modeLabel()).toHaveText(AUTH_LABELS.APIKEY);
    await expect.poll(() => readEditorValue(auth.field('apikey-key'))).toBe(apiKey.partialKey);
    await expect.poll(() => readEditorValue(auth.field('apikey-value'))).toBe('');
    await expect(draftIcon).toHaveAttribute('data-has-draft', 'true');
    await discardRequestDraft(page, requests.discard);
  });

  await test.step('Reopen and verify saved Basic auth in the editor and on the wire', async () => {
    await openRequestAuth(page, collectionName, requests.discard);
    await expect(auth.modeLabel()).toHaveText(AUTH_LABELS.BASIC);
    await expect.poll(() => readEditorValue(auth.field('basic-username'))).toBe(basic.username);
    await expect.poll(() => readEditorValue(auth.field('basic-password'))).toBe(basic.password);

    await request.sendButton().click();
    const encoded = Buffer.from(`${basic.username}:${basic.password}`).toString('base64');
    await expect(responseEditor).toBeVisible({ timeout: echoResponseTimeout });
    await expect.poll(() => readEchoedHeaders(responseEditor))
      .toHaveProperty('authorization', `Basic ${encoded}`);
  });
});

test('TC-2243: restores the saved API key at each scope and shows inherited collection auth', { tag: '@sanity' }, async ({
  pageWithUserData: page
}) => {
  const { auth, tabs } = buildCommonLocators(page);
  const draftIcon = tabs.requestTabDraftIcon(tabs.activeRequestTab());

  const scopes = [
    {
      name: 'request',
      value: apiKey.requestValue,
      open: () => openRequestAuth(page, collectionName, requests.inheritance),
      save: () => pressSaveShortcut(page)
    },
    {
      name: 'folder',
      value: apiKey.folderValue,
      open: () => openFolderAuth(page, collectionName, folderName),
      save: () => auth.saveSettingsButton().click()
    },
    {
      name: 'collection',
      value: apiKey.collectionValue,
      open: () => openCollectionAuth(page, collectionName),
      save: () => auth.saveSettingsButton().click()
    }
  ];

  for (const { name, value, open, save } of scopes) {
    await open();
    await configureApiKey(page, value);

    for (const placement of ['queryparams', 'header'] as const) {
      await test.step(`Restore the saved API key on the ${name} with ${API_KEY_PLACEMENT_LABELS[placement]} placement`, async () => {
        await selectApiKeyPlacement(page, placement);
        await expect(draftIcon).toHaveAttribute('data-has-draft', 'true');
        await save();
        await expect(draftIcon).toHaveAttribute('data-has-draft', 'false');

        await selectAuthModeById(page, AUTH_MODE_IDS.BEARER);
        await editAuthField(page, 'bearer-token', bearer.draft);
        await expect(auth.modeLabel()).toHaveText(AUTH_LABELS.BEARER);
        await expect.poll(() => readEditorValue(auth.field('bearer-token'))).toBe(bearer.draft);

        await selectAuthModeById(page, AUTH_MODE_IDS.APIKEY);
        await expect(auth.modeLabel()).toHaveText(AUTH_LABELS.APIKEY);
        await expectApiKeyFields(auth, value, placement);
      });
    }
  }

  await test.step('Verify the request displays the API key inherited from the collection', async () => {
    await openRequestAuth(page, collectionName, requests.inheritance);
    await selectAuthModeById(page, AUTH_MODE_IDS.INHERIT);
    await expect(auth.modeLabel()).toHaveText(AUTH_LABELS.INHERIT);
    await expect(auth.inheritedSourceLabel()).toHaveText('Auth inherited from Collection:');
    await expect(auth.inheritedMode()).toHaveText(AUTH_LABELS.APIKEY);
    await expectApiKeyFields(auth, apiKey.collectionValue);
  });
});

test('TC-2244: restores the last saved auth through a sequence of draft mode switches', { tag: '@sanity' }, async ({
  pageWithUserData: page
}) => {
  const { auth, tabs } = buildCommonLocators(page);
  const draftIcon = tabs.requestTabDraftIcon(tabs.requestTabByName(requests.switchModes));
  const basicFields: [AuthField, string][] = [
    ['basic-username', basic.username],
    ['basic-password', basic.password]
  ];
  const drafts: { mode: keyof typeof AUTH_MODE_IDS; fields: [AuthField, string][] }[] = [
    { mode: 'DIGEST', fields: [['digest-username', digest.username], ['digest-password', digest.password]] },
    { mode: 'NTLM', fields: [] },
    { mode: 'AWSV4', fields: [['awsv4-access-key-id', awsAccessKeyId]] },
    { mode: 'WSSE', fields: [] },
    { mode: 'NONE', fields: [] }
  ];

  await test.step('Save API key auth', async () => {
    await openRequestAuth(page, collectionName, requests.switchModes);
    await configureApiKey(page, apiKey.sequenceValue);
    await saveRequestDraft(page, draftIcon);
    await expect(auth.modeLabel()).toHaveText(AUTH_LABELS.APIKEY);
    await expectApiKeyFields(auth, apiKey.sequenceValue);
  });

  await test.step('Switch through unsaved Bearer and Basic drafts and recover the API key', async () => {
    await selectAuthModeById(page, AUTH_MODE_IDS.BEARER);
    await editAuthField(page, 'bearer-token', bearer.draft);
    await expect.poll(() => readEditorValue(auth.field('bearer-token'))).toBe(bearer.draft);

    await selectAuthModeById(page, AUTH_MODE_IDS.BASIC);
    for (const [field, value] of basicFields) {
      await editAuthField(page, field, value);
      await expect.poll(() => readEditorValue(auth.field(field))).toBe(value);
    }

    await selectAuthModeById(page, AUTH_MODE_IDS.APIKEY);
    await expect(auth.modeLabel()).toHaveText(AUTH_LABELS.APIKEY);
    await expectApiKeyFields(auth, apiKey.sequenceValue);
  });

  await test.step('Keep the API key through Digest, NTLM, AWS Sig V4, WSSE, and No Auth drafts', async () => {
    for (const { mode, fields } of drafts) {
      await test.step(`Switch to ${AUTH_LABELS[mode]} without saving`, async () => {
        await selectAuthModeById(page, AUTH_MODE_IDS[mode]);
        await expect(auth.modeLabel()).toHaveText(AUTH_LABELS[mode]);
        for (const [field, value] of fields) {
          await editAuthField(page, field, value);
          await expect.poll(() => readEditorValue(auth.field(field))).toBe(value);
        }
      });
    }

    await selectAuthModeById(page, AUTH_MODE_IDS.APIKEY);
    await expect(auth.modeLabel()).toHaveText(AUTH_LABELS.APIKEY);
    await expectApiKeyFields(auth, apiKey.sequenceValue);
  });

  await test.step('Revisit edited auth modes and verify their unsaved fields were cleared', async () => {
    const editedDrafts = [{ mode: 'BASIC' as const, fields: basicFields }, ...drafts.filter(({ fields }) => fields.length > 0)];
    for (const { mode, fields } of editedDrafts) {
      await selectAuthModeById(page, AUTH_MODE_IDS[mode]);
      for (const [field] of fields) {
        await expect.poll(() => readEditorValue(auth.field(field))).toBe('');
      }
    }
  });

  await test.step('Verify saving Bearer replaces the API key as the saved mode', async () => {
    await selectAuthModeById(page, AUTH_MODE_IDS.BEARER);
    await expect.poll(() => readEditorValue(auth.field('bearer-token'))).toBe('');
    await editAuthField(page, 'bearer-token', bearer.replacement);
    await saveRequestDraft(page, draftIcon);

    await selectAuthModeById(page, AUTH_MODE_IDS.APIKEY);
    await expect.poll(() => readEditorValue(auth.field('apikey-key'))).toBe('');
    await expect.poll(() => readEditorValue(auth.field('apikey-value'))).toBe('');
    await selectAuthModeById(page, AUTH_MODE_IDS.BEARER);
    await expect.poll(() => readEditorValue(auth.field('bearer-token'))).toBe(bearer.replacement);
  });
});
