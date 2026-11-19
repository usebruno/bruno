import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  configureGraphqlApiKeyAuth,
  configureBasicAuth,
  configureBearerAuth,
  configureDigestAuth,
  configureOAuth2ClientCredentials,
  apiKeyPlacementLabel,
  authField,
  basicField,
  bearerField,
  digestField,
  oauthField,
  oauthGrantType,
  expandGraphqlSchemaField,
  loadGraphqlSchemaFromIntrospection,
  openGraphqlQueryBuilder,
  selectGraphqlRequestTab,
  openRequest,
  readGraphqlAuthField,
  saveRequest,
  selectEnvironment,
  selectResponsePaneTab,
  sendRequest
} from '../../utils/page';

// One Electron app at a time: parallel cold starts time out while the app loads.
test.describe.configure({ mode: 'serial' });

const COLLECTION_NAME = 'gql-introspection';
const REQUEST_NAME = 'GQL Introspection';
const ENVIRONMENT_NAME = 'GQL-Test';
/**
 * Open the GraphQL request from the collection that pageWithUserData loads from the fixture.
 * The app is shared across tests, so the Query Builder and response timeline can still hold
 * state from an earlier test. Close the builder and clear the timeline when the request is open.
 */
const openIntrospectionRequest = async (page: Page) => {
  const { tabs, timeline, graphqlQueryBuilder } = buildCommonLocators(page);
  if (await tabs.requestTab(REQUEST_NAME).isVisible()) {
    if (await graphqlQueryBuilder.container().isVisible()) {
      await graphqlQueryBuilder.toggleButton().click();
    }
    await selectResponsePaneTab(page, 'Timeline');
    await timeline.clearButton().click();
  }
  await openRequest(page, COLLECTION_NAME, REQUEST_NAME, { persist: true });
};

test.describe('GraphQL introspection with interpolated API Key auth', () => {
  test('TC-1479: loads the schema after API Key auth is set from environment variables', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const COMPANY_FIELDS = ['ceo', 'name', 'founder'];
    const { response, tabs, timeline, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page);

    await selectEnvironment(page, ENVIRONMENT_NAME);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureGraphqlApiKeyAuth(page, {
      key: '{{apiKeyHeader}}',
      value: '{{apiKey}}',
      addTo: apiKeyPlacementLabel.header
    });

    await test.step('Confirm API Key auth uses the interpolated header name and value', async () => {
      expect(await readGraphqlAuthField(page, authField.key)).toBe('{{apiKeyHeader}}');
      expect(await readGraphqlAuthField(page, authField.value)).toBe('{{apiKey}}');
      await expect(gql.placementLabel()).toHaveText(apiKeyPlacementLabel.header);
    });

    await saveRequest(page);
    await sendRequest(page);

    await test.step('Verify the company response', async () => {
      await expect(response.statusCode()).toContainText('200');
      await expect(response.previewContainer()).toContainText('SpaceX');
      await expect(response.previewContainer()).toContainText('Elon Musk');
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

    await test.step('Verify the schema includes the company operation', async () => {
      await expect(gql.rootType()).toContainText('Query');
      await expect(gql.fieldName()).toContainText('company');
    });

    await expandGraphqlSchemaField(page, 'Query.company');

    await test.step('Verify the company fields', async () => {
      for (const fieldName of COMPANY_FIELDS) {
        await expect(gql.field(`Query.company.${fieldName}`)).toBeVisible();
      }
    });
  });
});

test.describe('GraphQL introspection with interpolated OAuth 2.0 auth', () => {
  test('TC-1475: loads the schema after OAuth 2.0 auth is set from environment variables', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { auth, tabs, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page);

    await selectEnvironment(page, ENVIRONMENT_NAME);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureOAuth2ClientCredentials(page, {
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

    await test.step('Verify the schema includes the company operation', async () => {
      await expect(gql.rootType()).toContainText('Query');
      await expect(gql.fieldName()).toContainText('company');
    });
  });
});

test.describe('GraphQL introspection with interpolated Digest auth', () => {
  test('TC-1474: loads the schema after Digest auth is set from environment variables', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { tabs, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page);

    await selectEnvironment(page, ENVIRONMENT_NAME);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureDigestAuth(page, {
      username: '{{digestUsername}}',
      password: '{{digestPassword}}'
    });

    await test.step('Verify Digest auth stores the variable placeholders for username and password', async () => {
      await expect(gql.authModeLabel()).toContainText('Digest Auth');
      expect(await readGraphqlAuthField(page, digestField.username)).toBe('{{digestUsername}}');
      expect(await readGraphqlAuthField(page, digestField.password)).toBe('{{digestPassword}}');
    });

    await saveRequest(page);
    await sendRequest(page);
    await selectGraphqlRequestTab(page, 'query');
    await openGraphqlQueryBuilder(page);
    await loadGraphqlSchemaFromIntrospection(page);

    await test.step('Verify the schema includes the company operation', async () => {
      await expect(gql.rootType()).toContainText('Query');
      await expect(gql.fieldName()).toContainText('company');
    });
  });
});

test.describe('GraphQL introspection with interpolated Bearer Token auth', () => {
  test('TC-1473: loads the schema after Bearer Token auth is set from environment variables', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const BEARER_TOKEN = 'dummy-bearer-token-12345';
    const { tabs, timeline, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page);

    await selectEnvironment(page, ENVIRONMENT_NAME);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureBearerAuth(page, {
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

    await test.step('Verify the schema includes the company operation', async () => {
      await expect(gql.rootType()).toContainText('Query');
      await expect(gql.fieldName()).toContainText('company');
    });
  });
});

test.describe('GraphQL introspection with interpolated Basic auth', () => {
  test('TC-1472: loads the schema after Basic auth is set from environment variables', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const BASIC_USERNAME = 'testuser';
    const BASIC_PASSWORD = 'Test@123';
    const BASIC_AUTHORIZATION = `Basic ${Buffer.from(`${BASIC_USERNAME}:${BASIC_PASSWORD}`).toString('base64')}`;
    const { tabs, timeline, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page);

    await selectEnvironment(page, ENVIRONMENT_NAME);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureBasicAuth(page, {
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

    await test.step('Verify the schema includes the company operation', async () => {
      await expect(gql.rootType()).toContainText('Query');
      await expect(gql.fieldName()).toContainText('company');
    });
  });
});
