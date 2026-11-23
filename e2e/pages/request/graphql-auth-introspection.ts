import { expect, Locator, Page, test } from '../../playwright';
import { buildRequestTabsLocators } from '../app-shell/tabs';
import { selectResponsePaneTab } from '../response/pane';
import { buildTimelineLocators } from '../response/timeline';
import { openRequest } from '../sidebar/collection-tree';
import { authEditorByTestId, buildAuthLocators, writeAuthEditor } from './auth';
import { buildGraphqlQueryBuilderLocators } from './graphql-query-builder';

const graphqlTabLabel = {
  query: 'Query',
  auth: 'Auth'
} as const;

export const apiKeyPlacementLabel = {
  header: 'Header',
  queryParam: 'Query Param'
};

/** Test ids of the API Key auth fields. */
export const authField = {
  key: 'auth-apikey-key',
  value: 'auth-apikey-value'
};

/** Test ids of the OAuth 2.0 Client Credentials fields. */
export const oauthField = {
  clientId: 'oauth2-client-credentials-clientId',
  clientSecret: 'oauth2-client-credentials-clientSecret'
};

export const oauthGrantType = {
  clientCredentials: 'Client Credentials'
};

/** Test ids of the Digest auth fields. */
export const digestField = {
  username: 'auth-digest-username',
  password: 'auth-digest-password'
};

/** Test id of the Bearer Token field. */
export const bearerField = {
  token: 'auth-bearer-token'
};

/** Test ids of the Basic auth fields. */
export const basicField = {
  username: 'auth-basic-username',
  password: 'auth-basic-password'
};

export type GraphqlApiKeyAuth = {
  key: string;
  value: string;
  addTo: string;
};

const requestPane = (page: Page) => page.getByTestId('request-pane');

/**
 * Locators for a GraphQL request's API Key auth and its Query Builder introspection.
 * Prefer getByTestId, per the Playwright testing guide.
 * .CodeMirror remains only on the editor node inside each test-id wrapper.
 */
export const buildGraphqlAuthIntrospectionLocators = (page: Page) => {
  const auth = buildAuthLocators(page);

  return {
    requestTab: (key: string) => requestPane(page).getByTestId(`responsive-tab-${key}`),
    authModeLabel: () => auth.modeLabel(),
    apiKeyModeOption: () => auth.dropdownItem('apikey'),
    authFieldEditor: (testId: string) => authEditorByTestId(page, testId),
    placementLabel: () => auth.apiKey.placementLabel(),
    placementOption: (placement: string) =>
      page.getByTestId('auth-placement-selector').locator('.dropdown-item').getByText(placement, { exact: true }),
    moreActionsButton: () => requestPane(page).getByTestId('graphql-query-actions'),
    introspectionMenuItem: () => page.getByTestId('menu-dropdown-schema-introspection'),
    queryBuilder: () => page.getByTestId('gql-load-from-introspection-btn').or(page.getByTestId('query-builder-search')),
    loadFromIntrospectionButton: () => requestPane(page).getByTestId('gql-load-from-introspection-btn'),
    schemaLoadedToast: () => page.getByRole('status').getByText('GraphQL Schema loaded successfully'),
    queryBuilderTree: () => page.getByTestId('query-builder-tree').getByRole('treeitem').first(),
    rootType: () => requestPane(page).getByTestId('query-builder-root-Query'),
    field: (path: string) => requestPane(page).getByTestId(`query-builder-field-${path}`),
    fieldName: () => requestPane(page).getByTestId('query-builder-tree')
  };
};

const readCodeMirrorValue = async (editor: Locator): Promise<string> => {
  await editor.waitFor({ state: 'visible' });
  return editor.evaluate((editorElement) => (editorElement as any).CodeMirror?.getValue() ?? '');
};

/** Switch the open GraphQL request to its Query or Auth tab and check the tab is active. */
export const selectGraphqlRequestTab = async (page: Page, key: keyof typeof graphqlTabLabel) => {
  const tab = buildGraphqlAuthIntrospectionLocators(page).requestTab(key);

  await tab.click();
  await expect(tab).toHaveText(graphqlTabLabel[key]);
};

/**
 * Select API Key auth and fill the key, value, and placement.
 * Key and value may contain `{{variable}}` tokens.
 * @param page - The page object
 * @param auth - API Key key, value, and where to add it
 */
export const configureGraphqlApiKeyAuth = async (page: Page, auth: GraphqlApiKeyAuth) => {
  await test.step(`Configure API Key auth added to ${auth.addTo}`, async () => {
    await selectGraphqlRequestTab(page, 'auth');
    const gql = buildGraphqlAuthIntrospectionLocators(page);

    await gql.authModeLabel().click();
    await gql.apiKeyModeOption().click();
    await gql.authFieldEditor(authField.key).waitFor({ state: 'visible' });

    await writeAuthEditor(page, authField.key, auth.key);
    await writeAuthEditor(page, authField.value, auth.value);

    await gql.placementLabel().click();
    await gql.placementOption(auth.addTo).click();
  });
};

/** Read the text stored in an auth field, identified by its test id. */
export const readGraphqlAuthField = async (page: Page, testId: string): Promise<string> => {
  return readCodeMirrorValue(buildGraphqlAuthIntrospectionLocators(page).authFieldEditor(testId));
};

/**
 * Run Load from Introspection from the Query Builder.
 * Uses Refresh from Introspection when a schema is already cached.
 * @param page - The page object
 */
export const loadGraphqlSchemaFromIntrospection = async (page: Page) => {
  await test.step('Load the schema from introspection', async () => {
    const gql = buildGraphqlAuthIntrospectionLocators(page);
    const loadButton = gql.loadFromIntrospectionButton();

    if (await loadButton.isVisible()) {
      await loadButton.click();
    } else {
      await gql.moreActionsButton().click();
      await gql.introspectionMenuItem().waitFor({ state: 'visible' });
      await gql.introspectionMenuItem().click();
    }

    await gql.schemaLoadedToast().waitFor({ state: 'visible', timeout: 30000 });
    await gql.queryBuilderTree().waitFor({ state: 'visible' });
  });
};

/**
 * Expand a Query Builder field. A click on an open row collapses it, so an already open row is left as it is.
 * @param page - The page object
 * @param fieldPath - The schema path of the field, e.g. `Query.country`
 */
export const expandGraphqlSchemaField = async (page: Page, fieldPath: string) => {
  const fieldName = fieldPath.split('.').pop() ?? fieldPath;
  await test.step(`Expand schema field "${fieldPath}"`, async () => {
    const field = buildGraphqlAuthIntrospectionLocators(page).field(fieldPath);
    await field.waitFor({ state: 'visible' });

    if ((await field.getAttribute('aria-expanded')) === 'true') {
      await expect(field).toContainText(fieldName);
      return;
    }

    await field.getByText(fieldName, { exact: true }).click();
  });
};

/**
 * Open the GraphQL request from the collection that pageWithUserData loads from the fixture.
 * The app is shared across tests, so the Query Builder and response timeline can still hold
 * state from an earlier test. Close the builder and clear the timeline when the request is open.
 * @param page - The page object
 * @param collectionName - Name of the collection that holds the request
 * @param requestName - Name of the request to open
 */
export const openIntrospectionRequest = async (page: Page, collectionName: string, requestName: string) => {
  const tabs = buildRequestTabsLocators(page);
  const timeline = buildTimelineLocators(page);
  const graphqlQueryBuilder = buildGraphqlQueryBuilderLocators(page);

  if (await tabs.requestTab(requestName).isVisible()) {
    if (await graphqlQueryBuilder.container().isVisible()) {
      await graphqlQueryBuilder.toggleButton().click();
    }
    await selectResponsePaneTab(page, 'Timeline');
    await timeline.clearButton().click();
  }
  await openRequest(page, collectionName, requestName, { persist: true });
};
