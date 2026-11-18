import { test, expect, ElectronApplication, Page } from '../../../playwright';
import {
  addEnvironmentVariables,
  buildCommonLocators,
  closeAllCollections,
  closeEnvironmentPanel,
  configureGraphqlApiKeyAuth,
  configureGraphqlBasicAuth,
  configureGraphqlBearerAuth,
  configureGraphqlDigestAuth,
  configureGraphqlOAuth2ClientCredentials,
  apiKeyPlacement,
  authField,
  basicField,
  bearerField,
  digestField,
  oauthField,
  oauthGrantType,
  createEnvironment,
  expandGraphqlSchemaField,
  loadGraphqlSchemaFromIntrospection,
  openCollectionFromDialog,
  openGraphqlQueryBuilder,
  selectGraphqlRequestTab,
  openRequest,
  readGraphqlAuthField,
  saveEnvironment,
  saveRequest,
  selectResponsePaneTab,
  sendRequest,
  waitForCollectionMount
} from '../../utils/page';

// One Electron app at a time. A cold app plus the live schema call needs more than 30 seconds.
test.describe.configure({ mode: 'default', timeout: 60_000 });

test.afterEach(async ({ page }) => {
  await closeAllCollections(page);
});

const COLLECTION_NAME = 'gql-introspection';
const REQUEST_NAME = 'GQL Introspection';
const ENVIRONMENT_NAME = 'GQL-Test';
const ENDPOINT = 'https://countries.trevorblades.com/graphql';

/**
 * Open a fresh copy of the shared GraphQL yaml collection and its request.
 * Each test gets its own copy, so saving auth in one case does not leak into the next.
 */
const openIntrospectionRequest = async (
  page: Page,
  electronApp: ElectronApplication,
  collectionFixturePath: string
) => {
  await openCollectionFromDialog(page, electronApp, collectionFixturePath);
  await waitForCollectionMount(page, COLLECTION_NAME);
  await openRequest(page, COLLECTION_NAME, REQUEST_NAME, { persist: true });
  await expect(buildCommonLocators(page).tabs.activeRequestTab()).toContainText(REQUEST_NAME);
};

test.describe('GraphQL introspection with interpolated API Key auth', () => {
  test('TC-1479: loads the schema after API Key auth is set from environment variables', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const COUNTRY_FIELDS = ['code', 'name', 'capital', 'currency'];
    const { environment, response, tabs, timeline, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page, electronApp, collectionFixturePath!);

    await createEnvironment(page, ENVIRONMENT_NAME, 'collection');
    await addEnvironmentVariables(page, [
      { name: 'baseUrl', value: ENDPOINT },
      { name: 'apiKey', value: 'dummy-api-key-12345' },
      { name: 'apiKeyHeader', value: 'x-api-key' }
    ]);
    await saveEnvironment(page);

    await test.step('Confirm the GQL-Test environment', async () => {
      await expect(environment.currentEnvironment()).toContainText(ENVIRONMENT_NAME);
      await expect(environment.varRowsByValue('baseUrl', ENDPOINT)).toBeVisible();
      await expect(environment.varRowsByValue('apiKey', 'dummy-api-key-12345')).toBeVisible();
      await expect(environment.varRowsByValue('apiKeyHeader', 'x-api-key')).toBeVisible();
    });

    await closeEnvironmentPanel(page);
    await tabs.requestTab(REQUEST_NAME).click();
    await expect(tabs.activeRequestTab()).toContainText(REQUEST_NAME);

    await configureGraphqlApiKeyAuth(page, {
      key: '{{apiKeyHeader}}',
      value: '{{apiKey}}',
      addTo: apiKeyPlacement.header
    });
    await test.step('Confirm API Key auth uses the interpolated header name and value', async () => {
      expect(await readGraphqlAuthField(page, authField.key)).toBe('{{apiKeyHeader}}');
      expect(await readGraphqlAuthField(page, authField.value)).toBe('{{apiKey}}');
      await expect(gql.placementLabel()).toHaveText(apiKeyPlacement.header);
    });

    await saveRequest(page);
    await sendRequest(page);
    await test.step('Verify the country response', async () => {
      await expect(response.statusCode()).toContainText('200');
      await expect(response.previewContainer()).toContainText('India');
      await expect(response.previewContainer()).toContainText('New Delhi');
      await expect(response.previewContainer()).toContainText('INR');
    });

    await selectResponsePaneTab(page, 'Timeline');
    await test.step('Verify the interpolated API key header was sent', async () => {
      const timelineItem = timeline.lastItem();
      await timeline.itemHeader(timelineItem).click();
      await expect(timeline.headerValue(timelineItem, 'x-api-key')).toHaveText('dummy-api-key-12345');
    });

    await selectGraphqlRequestTab(page, 'query');
    await openGraphqlQueryBuilder(page);
    await expect(gql.queryBuilder()).toBeVisible();
    await loadGraphqlSchemaFromIntrospection(page);
    await test.step('Confirm the schema loaded', async () => {
      await expect(gql.schemaLoadedToast()).toBeVisible();
      await expect(gql.queryBuilderTree()).toBeVisible();
    });

    await test.step('Verify the schema includes the country operation', async () => {
      await expect(gql.rootType()).toContainText('Query');
      await expect(gql.fieldName()).toContainText('country');
      await expect(gql.fieldName()).toContainText('countries');
    });

    await expandGraphqlSchemaField(page, 'Query.country');
    await test.step('Verify the country fields', async () => {
      for (const fieldName of COUNTRY_FIELDS) {
        await expect(gql.fieldName()).toContainText(fieldName);
      }
    });
  });
});

test.describe('GraphQL introspection with interpolated OAuth 2.0 auth', () => {
  test('TC-1475: loads the schema after OAuth 2.0 auth is set from environment variables', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const OAUTH_CLIENT_ID = 'dummy-client-id';
    const OAUTH_CLIENT_SECRET = 'dummy-client-secret';
    const { auth, tabs, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page, electronApp, collectionFixturePath!);

    await createEnvironment(page, ENVIRONMENT_NAME, 'collection');
    await addEnvironmentVariables(page, [
      { name: 'baseUrl', value: ENDPOINT },
      { name: 'clientId', value: OAUTH_CLIENT_ID },
      { name: 'clientSecret', value: OAUTH_CLIENT_SECRET }
    ]);
    await saveEnvironment(page);
    await closeEnvironmentPanel(page);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureGraphqlOAuth2ClientCredentials(page, {
      clientId: '{{clientId}}',
      clientSecret: '{{clientSecret}}'
    });
    await test.step('Confirm OAuth 2.0 uses the interpolated client id and secret', async () => {
      await expect(gql.authModeLabel()).toContainText('OAuth 2.0');
      await expect(auth.oauth2.grantTypeDropdown()).toContainText(oauthGrantType.clientCredentials);
      expect(await readGraphqlAuthField(page, oauthField.clientId)).toBe('{{clientId}}');
      expect(await readGraphqlAuthField(page, oauthField.clientSecret)).toBe('{{clientSecret}}');
    });

    await saveRequest(page);
    await sendRequest(page);
    await selectGraphqlRequestTab(page, 'query');
    await openGraphqlQueryBuilder(page);
    await loadGraphqlSchemaFromIntrospection(page);
  });
});

test.describe('GraphQL introspection with interpolated Digest auth', () => {
  test('TC-1474: loads the schema after Digest auth is set from environment variables', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const DIGEST_USERNAME = 'testuser';
    const DIGEST_PASSWORD = 'Test@123';
    const { tabs, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page, electronApp, collectionFixturePath!);

    await createEnvironment(page, ENVIRONMENT_NAME, 'collection');
    await addEnvironmentVariables(page, [
      { name: 'digestUsername', value: DIGEST_USERNAME },
      { name: 'digestPassword', value: DIGEST_PASSWORD }
    ]);
    await saveEnvironment(page);
    await closeEnvironmentPanel(page);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureGraphqlDigestAuth(page, {
      username: '{{digestUsername}}',
      password: '{{digestPassword}}'
    });
    await test.step('Confirm Digest auth uses the interpolated username and password', async () => {
      await expect(gql.authModeLabel()).toContainText('Digest Auth');
      expect(await readGraphqlAuthField(page, digestField.username)).toBe('{{digestUsername}}');
      expect(await readGraphqlAuthField(page, digestField.password)).toBe('{{digestPassword}}');
    });

    await saveRequest(page);
    await sendRequest(page);
    await selectGraphqlRequestTab(page, 'query');
    await openGraphqlQueryBuilder(page);
    await loadGraphqlSchemaFromIntrospection(page);
  });
});

test.describe('GraphQL introspection with interpolated Bearer Token auth', () => {
  test('TC-1473: loads the schema after Bearer Token auth is set from environment variables', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const BEARER_TOKEN = 'dummy-bearer-token-12345';
    const { tabs, timeline, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page, electronApp, collectionFixturePath!);

    await createEnvironment(page, ENVIRONMENT_NAME, 'collection');
    await addEnvironmentVariables(page, [
      { name: 'baseUrl', value: ENDPOINT },
      { name: 'bearerToken', value: BEARER_TOKEN }
    ]);
    await saveEnvironment(page);
    await closeEnvironmentPanel(page);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureGraphqlBearerAuth(page, {
      token: '{{bearerToken}}'
    });
    await test.step('Confirm Bearer Token auth uses the interpolated token', async () => {
      await expect(gql.authModeLabel()).toContainText('Bearer Token');
      expect(await readGraphqlAuthField(page, bearerField.token)).toBe('{{bearerToken}}');
    });

    await saveRequest(page);
    await sendRequest(page);
    await selectResponsePaneTab(page, 'Timeline');
    await test.step('Verify the interpolated bearer token was sent', async () => {
      const timelineItem = timeline.lastItem();
      await timeline.itemHeader(timelineItem).click();
      await expect(timeline.headerValue(timelineItem, 'Authorization')).toHaveText(`Bearer ${BEARER_TOKEN}`);
    });

    await selectGraphqlRequestTab(page, 'query');
    await openGraphqlQueryBuilder(page);
    await loadGraphqlSchemaFromIntrospection(page);
  });
});

test.describe('GraphQL introspection with interpolated Basic auth', () => {
  test('TC-1472: loads the schema after Basic auth is set from environment variables', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const BASIC_USERNAME = 'testuser';
    const BASIC_PASSWORD = 'Test@123';
    const BASIC_AUTHORIZATION = `Basic ${Buffer.from(`${BASIC_USERNAME}:${BASIC_PASSWORD}`).toString('base64')}`;
    const { tabs, timeline, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page, electronApp, collectionFixturePath!);

    await createEnvironment(page, ENVIRONMENT_NAME, 'collection');
    await addEnvironmentVariables(page, [
      { name: 'baseUrl', value: ENDPOINT },
      { name: 'basicUsername', value: BASIC_USERNAME },
      { name: 'basicPassword', value: BASIC_PASSWORD }
    ]);
    await saveEnvironment(page);
    await closeEnvironmentPanel(page);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureGraphqlBasicAuth(page, {
      username: '{{basicUsername}}',
      password: '{{basicPassword}}'
    });
    await test.step('Confirm Basic auth uses the interpolated username and password', async () => {
      await expect(gql.authModeLabel()).toContainText('Basic Auth');
      expect(await readGraphqlAuthField(page, basicField.username)).toBe('{{basicUsername}}');
      expect(await readGraphqlAuthField(page, basicField.password)).toBe('{{basicPassword}}');
    });

    await saveRequest(page);
    await sendRequest(page);
    await selectResponsePaneTab(page, 'Timeline');
    await test.step('Verify the interpolated basic credentials were sent', async () => {
      const timelineItem = timeline.lastItem();
      await timeline.itemHeader(timelineItem).click();
      await expect(timeline.headerValue(timelineItem, 'Authorization')).toHaveText(BASIC_AUTHORIZATION);
    });

    await selectGraphqlRequestTab(page, 'query');
    await openGraphqlQueryBuilder(page);
    await loadGraphqlSchemaFromIntrospection(page);
  });
});
