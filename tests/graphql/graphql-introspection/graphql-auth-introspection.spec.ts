import { test, expect } from '../../../playwright';
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
  createCollection,
  createEnvironment,
  createRequest,
  expandGraphqlSchemaField,
  loadGraphqlSchemaFromIntrospection,
  openGraphqlQueryBuilder,
  readGraphqlAuthField,
  readGraphqlQuery,
  readGraphqlVariables,
  saveEnvironment,
  saveRequest,
  selectResponsePaneTab,
  sendRequest,
  setGraphqlQuery,
  setGraphqlVariables
} from '../../utils/page';

// One Electron app at a time. A cold app plus the live schema call needs more than 30 seconds.
test.describe.configure({ mode: 'default', timeout: 60_000 });

const COLLECTION_NAME = 'gql-api-key-introspection';
const REQUEST_NAME = 'GQL API Key Introspection Test';
const ENVIRONMENT_NAME = 'GQL-Test';
const ENDPOINT = 'https://countries.trevorblades.com/graphql';

const QUERY = `query GetCountry($code: ID!) {
  country(code: $code) {
    code
    name
    capital
    currency
  }
}`;

const VARIABLES = `{
  "code": "IN"
}`;

const COUNTRY_FIELDS = ['code', 'name', 'capital', 'currency'];

test.describe('GraphQL introspection with interpolated API Key auth', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-1479: loads the schema after API Key auth is set from environment variables', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { environment, request, response, sidebar, tabs, timeline, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, COLLECTION_NAME, await createTmpDir('gql-api-key-introspection'));
      await expect(sidebar.collection(COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Create a GraphQL POST request', async () => {
      await createRequest(page, REQUEST_NAME, COLLECTION_NAME, {
        requestType: 'graphql',
        method: 'POST',
        url: ENDPOINT
      });
      await expect(sidebar.request(REQUEST_NAME)).toBeVisible();
      await expect(tabs.activeRequestTab()).toContainText(REQUEST_NAME);
      await expect(tabs.activeRequestTabMethod()).toHaveText('GQL');
      await expect(request.urlLine()).toContainText(ENDPOINT);
    });

    await test.step('Enter the GetCountry query and variables', async () => {
      await setGraphqlQuery(page, QUERY);
      await setGraphqlVariables(page, VARIABLES);
      await expect.poll(() => readGraphqlQuery(page)).toBe(QUERY);
      await expect.poll(() => readGraphqlVariables(page)).toBe(VARIABLES);
    });

    await test.step('Create the GQL-Test environment and its variables', async () => {
      await createEnvironment(page, ENVIRONMENT_NAME, 'collection');
      await addEnvironmentVariables(page, [
        { name: 'baseUrl', value: ENDPOINT },
        { name: 'apiKey', value: 'dummy-api-key-12345' },
        { name: 'apiKeyHeader', value: 'x-api-key' }
      ]);
      await saveEnvironment(page);

      await expect(environment.currentEnvironment()).toContainText(ENVIRONMENT_NAME);
      await expect(environment.varRowsByValue('baseUrl', ENDPOINT)).toBeVisible();
      await expect(environment.varRowsByValue('apiKey', 'dummy-api-key-12345')).toBeVisible();
      await expect(environment.varRowsByValue('apiKeyHeader', 'x-api-key')).toBeVisible();

      await closeEnvironmentPanel(page);
      await tabs.requestTab(REQUEST_NAME).click();
      await expect(tabs.activeRequestTab()).toContainText(REQUEST_NAME);
    });

    await test.step('Set API Key auth to the interpolated header name and value', async () => {
      await configureGraphqlApiKeyAuth(page, {
        key: '{{apiKeyHeader}}',
        value: '{{apiKey}}',
        addTo: apiKeyPlacement.header
      });
      await expect.poll(() => readGraphqlAuthField(page, authField.key)).toBe('{{apiKeyHeader}}');
      await expect.poll(() => readGraphqlAuthField(page, authField.value)).toBe('{{apiKey}}');
      await expect(gql.placementLabel()).toHaveText(apiKeyPlacement.header);
    });

    await test.step('Run the request and verify the country response', async () => {
      await saveRequest(page);
      await sendRequest(page);
      await expect(response.statusCode()).toContainText('200');
      await expect(response.previewContainer()).toContainText('India');
      await expect(response.previewContainer()).toContainText('New Delhi');
      await expect(response.previewContainer()).toContainText('INR');
    });

    await test.step('Verify the interpolated API key header was sent', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      const timelineItem = timeline.lastItem();
      await timeline.itemHeader(timelineItem).click();
      await expect(timeline.headerValue(timelineItem, 'x-api-key')).toHaveText('dummy-api-key-12345');
    });

    await test.step('Load the schema from introspection', async () => {
      await openGraphqlQueryBuilder(page);
      await expect(gql.queryBuilder()).toBeVisible();
      await loadGraphqlSchemaFromIntrospection(page);
      await expect(gql.schemaLoadedToast()).toBeVisible();
      await expect(gql.queryBuilderTree()).toBeVisible();
    });

    await test.step('Verify the schema includes the country operation and its fields', async () => {
      await expect(gql.rootType('Query')).toBeVisible();
      await expect(gql.fieldName('country')).toBeVisible();
      await expect(gql.fieldName('countries')).toBeVisible();

      await expandGraphqlSchemaField(page, 'country');
      for (const fieldName of COUNTRY_FIELDS) {
        await expect(gql.fieldName(fieldName)).toBeVisible();
      }
    });
  });
});

const OAUTH_COLLECTION_NAME = 'gql-oauth-introspection';
const OAUTH_REQUEST_NAME = 'GQL OAuth Introspection Test';
const OAUTH_ENVIRONMENT_NAME = 'GQL-Test';
const OAUTH_CLIENT_ID = 'dummy-client-id';
const OAUTH_CLIENT_SECRET = 'dummy-client-secret';

const OAUTH_QUERY = `query GetCountry {
  country(code: "IN") {
    name
    capital
    currency
  }
}`;

const OAUTH_COUNTRY_FIELDS = ['name', 'capital', 'currency'];

test.describe('GraphQL introspection with interpolated OAuth 2.0 auth', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-1475: loads the schema after OAuth 2.0 auth is set from environment variables', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { auth, environment, request, response, sidebar, tabs, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, OAUTH_COLLECTION_NAME, await createTmpDir('gql-oauth-introspection'));
      await expect(sidebar.collection(OAUTH_COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Create a GraphQL POST request', async () => {
      await createRequest(page, OAUTH_REQUEST_NAME, OAUTH_COLLECTION_NAME, {
        requestType: 'graphql',
        method: 'POST',
        url: '{{baseUrl}}'
      });
      await expect(sidebar.request(OAUTH_REQUEST_NAME)).toBeVisible();
      await expect(tabs.activeRequestTab()).toContainText(OAUTH_REQUEST_NAME);
      await expect(tabs.activeRequestTabMethod()).toHaveText('GQL');
      await expect(request.urlLine()).toContainText('{{baseUrl}}');
    });

    await test.step('Enter the GetCountry query', async () => {
      await setGraphqlQuery(page, OAUTH_QUERY);
      await expect.poll(() => readGraphqlQuery(page)).toBe(OAUTH_QUERY);
    });

    await test.step('Create the GQL-Test environment and its variables', async () => {
      await createEnvironment(page, OAUTH_ENVIRONMENT_NAME, 'collection');
      await addEnvironmentVariables(page, [
        { name: 'baseUrl', value: ENDPOINT },
        { name: 'clientId', value: OAUTH_CLIENT_ID },
        { name: 'clientSecret', value: OAUTH_CLIENT_SECRET }
      ]);
      await saveEnvironment(page);

      await expect(environment.currentEnvironment()).toContainText(OAUTH_ENVIRONMENT_NAME);
      await expect(environment.varRowsByValue('baseUrl', ENDPOINT)).toBeVisible();
      await expect(environment.varRowsByValue('clientId', OAUTH_CLIENT_ID)).toBeVisible();
      await expect(environment.varRowsByValue('clientSecret', OAUTH_CLIENT_SECRET)).toBeVisible();

      await closeEnvironmentPanel(page);
      await tabs.requestTab(OAUTH_REQUEST_NAME).click();
      await expect(tabs.activeRequestTab()).toContainText(OAUTH_REQUEST_NAME);
    });

    await test.step('Set OAuth 2.0 Client Credentials to the interpolated client id and secret', async () => {
      await configureGraphqlOAuth2ClientCredentials(page, {
        clientId: '{{clientId}}',
        clientSecret: '{{clientSecret}}'
      });
      await expect(gql.authModeLabel()).toContainText('OAuth 2.0');
      await expect(auth.oauth2.grantTypeDropdown()).toContainText(oauthGrantType.clientCredentials);
      await expect.poll(() => readGraphqlAuthField(page, oauthField.clientId)).toBe('{{clientId}}');
      await expect.poll(() => readGraphqlAuthField(page, oauthField.clientSecret)).toBe('{{clientSecret}}');
    });

    await test.step('Run the request and verify the country response', async () => {
      await saveRequest(page);
      await sendRequest(page);
      await expect(response.statusCode()).toContainText('200');
      await expect(response.previewContainer()).toContainText('India');
      await expect(response.previewContainer()).toContainText('New Delhi');
      await expect(response.previewContainer()).toContainText('INR');
    });

    await test.step('Load the schema from introspection', async () => {
      await openGraphqlQueryBuilder(page);
      await expect(gql.queryBuilder()).toBeVisible();
      await loadGraphqlSchemaFromIntrospection(page);
      await expect(gql.schemaLoadedToast()).toBeVisible();
      await expect(gql.queryBuilderTree()).toBeVisible();
    });

    await test.step('Verify the schema includes the country operation and its fields', async () => {
      await expect(gql.rootType('Query')).toBeVisible();
      await expect(gql.fieldName('country')).toBeVisible();
      await expect(gql.fieldName('countries')).toBeVisible();

      await expandGraphqlSchemaField(page, 'country');
      for (const fieldName of OAUTH_COUNTRY_FIELDS) {
        await expect(gql.fieldName(fieldName)).toBeVisible();
      }
    });
  });
});

const DIGEST_COLLECTION_NAME = 'gql-digest-introspection';
const DIGEST_REQUEST_NAME = 'GQL Digest Introspection Test';
const DIGEST_ENVIRONMENT_NAME = 'GQL-Test';
const DIGEST_USERNAME = 'testuser';
const DIGEST_PASSWORD = 'Test@123';

const DIGEST_QUERY = `query GetCountry {
  country(code: "IN") {
    name
    capital
    currency
  }
}`;

const DIGEST_COUNTRY_FIELDS = ['name', 'capital', 'currency'];

test.describe('GraphQL introspection with interpolated Digest auth', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-1474: loads the schema after Digest auth is set from environment variables', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { environment, request, response, sidebar, tabs, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, DIGEST_COLLECTION_NAME, await createTmpDir('gql-digest-introspection'));
      await expect(sidebar.collection(DIGEST_COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Create a GraphQL POST request', async () => {
      await createRequest(page, DIGEST_REQUEST_NAME, DIGEST_COLLECTION_NAME, {
        requestType: 'graphql',
        method: 'POST',
        url: ENDPOINT
      });
      await expect(sidebar.request(DIGEST_REQUEST_NAME)).toBeVisible();
      await expect(tabs.activeRequestTab()).toContainText(DIGEST_REQUEST_NAME);
      await expect(tabs.activeRequestTabMethod()).toHaveText('GQL');
      await expect(request.urlLine()).toContainText(ENDPOINT);
    });

    await test.step('Enter the GetCountry query', async () => {
      await setGraphqlQuery(page, DIGEST_QUERY);
      await expect.poll(() => readGraphqlQuery(page)).toBe(DIGEST_QUERY);
    });

    await test.step('Create the GQL-Test environment and its variables', async () => {
      await createEnvironment(page, DIGEST_ENVIRONMENT_NAME, 'collection');
      await addEnvironmentVariables(page, [
        { name: 'digestUsername', value: DIGEST_USERNAME },
        { name: 'digestPassword', value: DIGEST_PASSWORD }
      ]);
      await saveEnvironment(page);

      await expect(environment.currentEnvironment()).toContainText(DIGEST_ENVIRONMENT_NAME);
      await expect(environment.varRowsByValue('digestUsername', DIGEST_USERNAME)).toBeVisible();
      await expect(environment.varRowsByValue('digestPassword', DIGEST_PASSWORD)).toBeVisible();

      await closeEnvironmentPanel(page);
      await tabs.requestTab(DIGEST_REQUEST_NAME).click();
      await expect(tabs.activeRequestTab()).toContainText(DIGEST_REQUEST_NAME);
    });

    await test.step('Set Digest auth to the interpolated username and password', async () => {
      await configureGraphqlDigestAuth(page, {
        username: '{{digestUsername}}',
        password: '{{digestPassword}}'
      });
      await expect(gql.authModeLabel()).toContainText('Digest Auth');
      await expect.poll(() => readGraphqlAuthField(page, digestField.username)).toBe('{{digestUsername}}');
      await expect.poll(() => readGraphqlAuthField(page, digestField.password)).toBe('{{digestPassword}}');
    });

    await test.step('Run the request and verify the country response', async () => {
      await saveRequest(page);
      await sendRequest(page);
      await expect(response.statusCode()).toContainText('200');
      await expect(response.previewContainer()).toContainText('India');
      await expect(response.previewContainer()).toContainText('New Delhi');
      await expect(response.previewContainer()).toContainText('INR');
    });

    await test.step('Load the schema from introspection', async () => {
      await openGraphqlQueryBuilder(page);
      await expect(gql.queryBuilder()).toBeVisible();
      await loadGraphqlSchemaFromIntrospection(page);
      await expect(gql.schemaLoadedToast()).toBeVisible();
      await expect(gql.queryBuilderTree()).toBeVisible();
    });

    await test.step('Verify the schema includes the country operation and its fields', async () => {
      await expect(gql.rootType('Query')).toBeVisible();
      await expect(gql.fieldName('country')).toBeVisible();
      await expect(gql.fieldName('countries')).toBeVisible();

      await expandGraphqlSchemaField(page, 'country');
      for (const fieldName of DIGEST_COUNTRY_FIELDS) {
        await expect(gql.fieldName(fieldName)).toBeVisible();
      }
    });
  });
});

const BEARER_COLLECTION_NAME = 'gql-bearer-introspection';
const BEARER_REQUEST_NAME = 'GQL Bearer Introspection';
const BEARER_ENVIRONMENT_NAME = 'GQL-Test';
const BEARER_TOKEN = 'dummy-bearer-token-12345';

const BEARER_QUERY = `query GetCountry {
  country(code: "IN") {
    code
    name
    capital
    currency
  }
}`;

const BEARER_COUNTRY_FIELDS = ['code', 'name', 'capital', 'currency'];

test.describe('GraphQL introspection with interpolated Bearer Token auth', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-1473: loads the schema after Bearer Token auth is set from environment variables', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { environment, request, response, sidebar, tabs, timeline, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, BEARER_COLLECTION_NAME, await createTmpDir('gql-bearer-introspection'));
      await expect(sidebar.collection(BEARER_COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Create a GraphQL POST request', async () => {
      await createRequest(page, BEARER_REQUEST_NAME, BEARER_COLLECTION_NAME, {
        requestType: 'graphql',
        method: 'POST',
        url: '{{baseUrl}}'
      });
      await expect(sidebar.request(BEARER_REQUEST_NAME)).toBeVisible();
      await expect(tabs.activeRequestTab()).toContainText(BEARER_REQUEST_NAME);
      await expect(tabs.activeRequestTabMethod()).toHaveText('GQL');
      await expect(request.urlLine()).toContainText('{{baseUrl}}');
    });

    await test.step('Enter the GetCountry query', async () => {
      await setGraphqlQuery(page, BEARER_QUERY);
      await expect.poll(() => readGraphqlQuery(page)).toBe(BEARER_QUERY);
    });

    await test.step('Create the GQL-Test environment and its variables', async () => {
      await createEnvironment(page, BEARER_ENVIRONMENT_NAME, 'collection');
      await addEnvironmentVariables(page, [
        { name: 'baseUrl', value: ENDPOINT },
        { name: 'bearerToken', value: BEARER_TOKEN }
      ]);
      await saveEnvironment(page);

      await expect(environment.currentEnvironment()).toContainText(BEARER_ENVIRONMENT_NAME);
      await expect(environment.varRowsByValue('baseUrl', ENDPOINT)).toBeVisible();
      await expect(environment.varRowsByValue('bearerToken', BEARER_TOKEN)).toBeVisible();

      await closeEnvironmentPanel(page);
      await tabs.requestTab(BEARER_REQUEST_NAME).click();
      await expect(tabs.activeRequestTab()).toContainText(BEARER_REQUEST_NAME);
    });

    await test.step('Set Bearer Token auth to the interpolated token', async () => {
      await configureGraphqlBearerAuth(page, {
        token: '{{bearerToken}}'
      });
      await expect(gql.authModeLabel()).toContainText('Bearer Token');
      await expect.poll(() => readGraphqlAuthField(page, bearerField.token)).toBe('{{bearerToken}}');
    });

    await test.step('Run the request and verify the country response', async () => {
      await saveRequest(page);
      await sendRequest(page);
      await expect(response.statusCode()).toContainText('200');
      await expect(response.previewContainer()).toContainText('India');
      await expect(response.previewContainer()).toContainText('New Delhi');
      await expect(response.previewContainer()).toContainText('INR');
    });

    await test.step('Verify the interpolated bearer token was sent', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      const timelineItem = timeline.lastItem();
      await timeline.itemHeader(timelineItem).click();
      await expect(timeline.headerValue(timelineItem, 'Authorization')).toHaveText(`Bearer ${BEARER_TOKEN}`);
    });

    await test.step('Load the schema from introspection', async () => {
      await openGraphqlQueryBuilder(page);
      await expect(gql.queryBuilder()).toBeVisible();
      await loadGraphqlSchemaFromIntrospection(page);
      await expect(gql.schemaLoadedToast()).toBeVisible();
      await expect(gql.queryBuilderTree()).toBeVisible();
    });

    await test.step('Verify the schema includes the country operation and its fields', async () => {
      await expect(gql.rootType('Query')).toBeVisible();
      await expect(gql.fieldName('country')).toBeVisible();
      await expect(gql.fieldName('countries')).toBeVisible();

      await expandGraphqlSchemaField(page, 'country');
      for (const fieldName of BEARER_COUNTRY_FIELDS) {
        await expect(gql.fieldName(fieldName)).toBeVisible();
      }
    });
  });
});

const BASIC_COLLECTION_NAME = 'gql-basic-introspection';
const BASIC_REQUEST_NAME = 'GQL Basic Auth Introspection';
const BASIC_ENVIRONMENT_NAME = 'GQL-Test';
const BASIC_USERNAME = 'testuser';
const BASIC_PASSWORD = 'Test@123';
const BASIC_AUTHORIZATION = `Basic ${Buffer.from(`${BASIC_USERNAME}:${BASIC_PASSWORD}`).toString('base64')}`;

const BASIC_QUERY = `query GetCountry {
  country(code: "IN") {
    code
    name
    capital
    currency
  }
}`;

const BASIC_COUNTRY_FIELDS = ['code', 'name', 'capital', 'currency'];

test.describe('GraphQL introspection with interpolated Basic auth', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-1472: loads the schema after Basic auth is set from environment variables', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { environment, request, response, sidebar, tabs, timeline, graphqlAuthIntrospection: gql } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, BASIC_COLLECTION_NAME, await createTmpDir('gql-basic-introspection'));
      await expect(sidebar.collection(BASIC_COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Create a GraphQL POST request', async () => {
      await createRequest(page, BASIC_REQUEST_NAME, BASIC_COLLECTION_NAME, {
        requestType: 'graphql',
        method: 'POST',
        url: '{{baseUrl}}'
      });
      await expect(sidebar.request(BASIC_REQUEST_NAME)).toBeVisible();
      await expect(tabs.activeRequestTab()).toContainText(BASIC_REQUEST_NAME);
      await expect(tabs.activeRequestTabMethod()).toHaveText('GQL');
      await expect(request.urlLine()).toContainText('{{baseUrl}}');
    });

    await test.step('Enter the GetCountry query', async () => {
      await setGraphqlQuery(page, BASIC_QUERY);
      await expect.poll(() => readGraphqlQuery(page)).toBe(BASIC_QUERY);
    });

    await test.step('Create the GQL-Test environment and its variables', async () => {
      await createEnvironment(page, BASIC_ENVIRONMENT_NAME, 'collection');
      await addEnvironmentVariables(page, [
        { name: 'baseUrl', value: ENDPOINT },
        { name: 'basicUsername', value: BASIC_USERNAME },
        { name: 'basicPassword', value: BASIC_PASSWORD }
      ]);
      await saveEnvironment(page);

      await expect(environment.currentEnvironment()).toContainText(BASIC_ENVIRONMENT_NAME);
      await expect(environment.varRowsByValue('baseUrl', ENDPOINT)).toBeVisible();
      await expect(environment.varRowsByValue('basicUsername', BASIC_USERNAME)).toBeVisible();
      await expect(environment.varRowsByValue('basicPassword', BASIC_PASSWORD)).toBeVisible();

      await closeEnvironmentPanel(page);
      await tabs.requestTab(BASIC_REQUEST_NAME).click();
      await expect(tabs.activeRequestTab()).toContainText(BASIC_REQUEST_NAME);
    });

    await test.step('Set Basic auth to the interpolated username and password', async () => {
      await configureGraphqlBasicAuth(page, {
        username: '{{basicUsername}}',
        password: '{{basicPassword}}'
      });
      await expect(gql.authModeLabel()).toContainText('Basic Auth');
      await expect.poll(() => readGraphqlAuthField(page, basicField.username)).toBe('{{basicUsername}}');
      await expect.poll(() => readGraphqlAuthField(page, basicField.password)).toBe('{{basicPassword}}');
    });

    await test.step('Run the request and verify the country response', async () => {
      await saveRequest(page);
      await sendRequest(page);
      await expect(response.statusCode()).toContainText('200');
      await expect(response.previewContainer()).toContainText('India');
      await expect(response.previewContainer()).toContainText('New Delhi');
      await expect(response.previewContainer()).toContainText('INR');
    });

    await test.step('Verify the interpolated basic credentials were sent', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      const timelineItem = timeline.lastItem();
      await timeline.itemHeader(timelineItem).click();
      await expect(timeline.headerValue(timelineItem, 'Authorization')).toHaveText(BASIC_AUTHORIZATION);
    });

    await test.step('Load the schema from introspection', async () => {
      await openGraphqlQueryBuilder(page);
      await expect(gql.queryBuilder()).toBeVisible();
      await loadGraphqlSchemaFromIntrospection(page);
      await expect(gql.schemaLoadedToast()).toBeVisible();
      await expect(gql.queryBuilderTree()).toBeVisible();
    });

    await test.step('Verify the schema includes the country operation and its fields', async () => {
      await expect(gql.rootType('Query')).toBeVisible();
      await expect(gql.fieldName('country')).toBeVisible();
      await expect(gql.fieldName('countries')).toBeVisible();

      await expandGraphqlSchemaField(page, 'country');
      for (const fieldName of BASIC_COUNTRY_FIELDS) {
        await expect(gql.fieldName(fieldName)).toBeVisible();
      }
    });
  });
});
