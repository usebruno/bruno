import { expect, Locator, Page, test } from '../../../playwright';
import { writeCodeMirrorValue } from './actions';

const graphqlTabLabel = {
  query: 'Query',
  auth: 'Auth'
} as const;

export const apiKeyPlacement = {
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
 * Locators for a GraphQL request's query, variables, API Key auth, and Query Builder.
 * Prefer getByTestId, per the Playwright testing guide.
 * .CodeMirror remains only on the editor node inside each test-id wrapper.
 */
export const buildGraphqlAuthIntrospectionLocators = (page: Page) => ({
  queryEditor: () => page.getByTestId('graphql-query-editor').locator('.CodeMirror').first(),
  variablesToggle: () => requestPane(page).getByTestId('graphql-variables-toggle'),
  variablesEditor: () => page.getByTestId('graphql-variables-editor').locator('.CodeMirror').first(),
  requestTab: (key: string) => requestPane(page).getByTestId(`responsive-tab-${key}`),
  authModeLabel: () => page.getByTestId('auth-mode-label'),
  apiKeyModeOption: () => page.getByTestId('auth-mode-dropdown-apikey'),
  authFieldEditor: (testId: string) => page.getByTestId(testId).locator('.CodeMirror').first(),
  placementLabel: () => page.getByTestId('auth-placement-label'),
  placementOption: (placement: string) =>
    page.getByTestId('auth-placement-selector').locator('.dropdown-item').getByText(placement, { exact: true }),
  moreActionsButton: () => requestPane(page).getByTestId('graphql-query-actions'),
  introspectionMenuItem: () => page.getByTestId('menu-dropdown-schema-introspection'),
  queryBuilder: () => page.getByTestId('graphql-load-from-introspection').or(page.getByTestId('query-builder-search')),
  loadFromIntrospectionButton: () => requestPane(page).getByTestId('graphql-load-from-introspection'),
  schemaLoadedToast: () => page.getByRole('status').getByText('GraphQL Schema loaded successfully'),
  queryBuilderTree: () => page.getByTestId('query-builder-tree').getByRole('treeitem').first(),
  rootType: () => requestPane(page).getByTestId(/^query-builder-root-/),
  field: (path: string) => requestPane(page).getByTestId(`query-builder-field-${path}`),
  fieldName: () => requestPane(page).getByTestId('query-builder-tree')
});

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
 * Replace the GraphQL query in the open request.
 * @param page - The page object
 * @param query - The query document to write
 */
export const setGraphqlQuery = async (page: Page, query: string) => {
  await test.step('Set the GraphQL query', async () => {
    await selectGraphqlRequestTab(page, 'query');
    await writeCodeMirrorValue(buildGraphqlAuthIntrospectionLocators(page).queryEditor(), query);
  });
};

/**
 * Open the variables pane if needed and replace the GraphQL variables.
 * @param page - The page object
 * @param variablesJson - The variables document as JSON text. The editor stores text, not an object.
 */
export const setGraphqlVariables = async (page: Page, variablesJson: string) => {
  await test.step('Set the GraphQL variables', async () => {
    await selectGraphqlRequestTab(page, 'query');
    const gql = buildGraphqlAuthIntrospectionLocators(page);
    const editor = gql.variablesEditor();
    if (await editor.isVisible()) {
      await writeCodeMirrorValue(editor, variablesJson);
      return;
    }
    await gql.variablesToggle().click();
    await editor.waitFor({ state: 'visible' });
    await writeCodeMirrorValue(editor, variablesJson);
  });
};

/** Read the GraphQL query currently shown in the editor. */
export const readGraphqlQuery = async (page: Page): Promise<string> => {
  const gql = buildGraphqlAuthIntrospectionLocators(page);
  const editor = gql.queryEditor();
  return readCodeMirrorValue(editor);
};

/** Read the GraphQL variables currently shown in the editor. */
export const readGraphqlVariables = async (page: Page): Promise<string> => {
  const gql = buildGraphqlAuthIntrospectionLocators(page);
  const editor = gql.variablesEditor();
  if (await editor.isVisible()) {
    return readCodeMirrorValue(editor);
  }
  await gql.variablesToggle().click();
  await editor.waitFor({ state: 'visible' });
  return readCodeMirrorValue(editor);
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

    await writeCodeMirrorValue(gql.authFieldEditor(authField.key), auth.key);
    await writeCodeMirrorValue(gql.authFieldEditor(authField.value), auth.value);

    await gql.placementLabel().click();
    await gql.placementOption(auth.addTo).click();
  });
};

/** Read the text stored in an auth field, identified by its test id. */
export const readGraphqlAuthField = async (page: Page, testId: string): Promise<string> => {
  const gql = buildGraphqlAuthIntrospectionLocators(page);
  const editor = gql.authFieldEditor(testId);
  return readCodeMirrorValue(editor);
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
