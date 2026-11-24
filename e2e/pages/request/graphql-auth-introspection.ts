import { expect, test, type Page } from '../../playwright';
import { authEditorByTestId, buildAuthLocators, writeAuthEditor } from './auth';
const graphqlTabLabel = {
  query: 'Query',
  auth: 'Auth'
} as const;

export const apiKeyPlacementLabel = {
  header: 'Header',
  queryParam: 'Query Param'
};

/** Test ids of the API Key auth fields. */
const authField = {
  key: 'auth-apikey-key',
  value: 'auth-apikey-value'
};

type GraphqlApiKeyAuth = {
  key: string;
  value: string;
  addTo: string;
};

const requestPane = (page: Page) => page.getByTestId('request-pane');

/**
 * Locators for a GraphQL request's API Key auth and its Query Builder introspection.
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
      await gql.introspectionMenuItem().waitFor({ state: 'visible', timeout: 10000 });
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
      return;
    }

    await field.getByText(fieldName, { exact: true }).click();
  });
};
