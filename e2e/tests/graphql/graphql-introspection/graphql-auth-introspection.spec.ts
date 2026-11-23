import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  configureGraphqlApiKeyAuth,
  configureBasicAuth,
  configureBearerAuth,
  configureDigestAuth,
  configureOAuth2ClientCredentials,
  apiKeyPlacementLabel,
  expandGraphqlSchemaField,
  loadGraphqlSchemaFromIntrospection,
  openGraphqlQueryBuilder,
  selectGraphqlRequestTab,
  openIntrospectionRequest,
  saveRequest,
  selectEnvironment,
  sendRequest
} from '../../../pages';

// One Electron app at a time: parallel cold starts time out while the app loads.
test.describe.configure({ mode: 'serial' });

const COLLECTION_NAME = 'gql-introspection';
const REQUEST_NAME = 'GQL Introspection';
const ENVIRONMENT_NAME = 'gql-introspection-env';
test.describe('GraphQL introspection with interpolated API Key auth', () => {
  test('TC-1479: loads the schema after API Key auth is set from environment variables', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const COMPANY_FIELDS = ['ceo', 'name', 'founder'];
    const { tabs, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page, COLLECTION_NAME, REQUEST_NAME);
    await selectEnvironment(page, ENVIRONMENT_NAME);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureGraphqlApiKeyAuth(page, {
      key: '{{apiKeyHeader}}',
      value: '{{apiKey}}',
      addTo: apiKeyPlacementLabel.header
    });

    await saveRequest(page);
    await sendRequest(page);

    await selectGraphqlRequestTab(page, 'query');
    await openGraphqlQueryBuilder(page);

    await expect(gql.queryBuilder()).toBeVisible();
    await loadGraphqlSchemaFromIntrospection(page);

    await test.step('Verify the schema loaded', async () => {
      await expect(gql.schemaLoadedToast()).toBeVisible();
      await expect(gql.queryBuilderTree()).toBeVisible();
    });
    await page.waitForTimeout(5000);

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
    const { tabs, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page, COLLECTION_NAME, REQUEST_NAME);

    await selectEnvironment(page, ENVIRONMENT_NAME);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureOAuth2ClientCredentials(page, {
      clientId: '{{clientId}}',
      clientSecret: '{{clientSecret}}'
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

    await openIntrospectionRequest(page, COLLECTION_NAME, REQUEST_NAME);

    await selectEnvironment(page, ENVIRONMENT_NAME);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureDigestAuth(page, {
      username: '{{digestUsername}}',
      password: '{{digestPassword}}'
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
    const { tabs, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page, COLLECTION_NAME, REQUEST_NAME);

    await selectEnvironment(page, ENVIRONMENT_NAME);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureBearerAuth(page, {
      token: '{{bearerToken}}'
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

test.describe('GraphQL introspection with interpolated Basic auth', () => {
  test('TC-1472: loads the schema after Basic auth is set from environment variables', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { tabs, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await openIntrospectionRequest(page, COLLECTION_NAME, REQUEST_NAME);

    await selectEnvironment(page, ENVIRONMENT_NAME);
    await tabs.requestTab(REQUEST_NAME).click();

    await configureBasicAuth(page, {
      username: '{{basicUsername}}',
      password: '{{basicPassword}}'
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
