import { expect, Locator, Page, test } from '../../../playwright';

const graphqlRequestTab = {
  query: 'query',
  auth: 'auth'
};

export const apiKeyPlacement = {
  header: 'Header',
  queryParam: 'Query Param'
};

export const authField = {
  key: 'Key',
  value: 'Value'
};

export type GraphqlApiKeyAuth = {
  key: string;
  value: string;
  addTo: string;
};

const named = (name: string) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);

const requestPane = (page: Page) => page.getByTestId('request-pane');

/**
 * Locators for a GraphQL request's query, variables, API Key auth, and Query Builder.
 * Prefer getByTestId, getByRole, and getByLabel, per the Playwright testing guide.
 * .CodeMirror remains only on the editor node, which has no test id, role, or label.
 */
export const buildGraphqlAuthIntrospectionLocators = (page: Page) => ({
  queryEditor: () => page.getByLabel('Query Editor').locator('.CodeMirror').first(),
  variablesHeader: () => requestPane(page).getByRole('button', { name: 'Variables' }),
  variablesEditor: () => requestPane(page).getByLabel('Code Editor').locator('.CodeMirror').first(),
  requestTab: (key: string) => requestPane(page).getByTestId(`responsive-tab-${key}`),
  authModeLabel: () => page.getByTestId('auth-mode-label'),
  apiKeyModeOption: () => page.getByTestId('auth-mode-dropdown-apikey'),
  authFieldEditor: (label: string) =>
    requestPane(page).locator(`label:text-is("${label}") + div .CodeMirror`).first(),
  placementLabel: () => page.getByTestId('auth-placement-label'),
  placementOption: (placement: string) =>
    page.getByTestId('auth-placement-selector').locator('.dropdown-item').getByText(placement, { exact: true }),
  showQueryBuilderButton: () => requestPane(page).getByRole('button', { name: 'Show Query Builder' }),
  moreActionsButton: () => requestPane(page).getByRole('button', { name: 'More actions' }),
  introspectionMenuItem: () => page.getByTestId('menu-dropdown-schema-introspection'),
  queryBuilder: () =>
    requestPane(page).getByRole('button', { name: 'Load from Introspection' }).or(page.getByPlaceholder('Search operations...')),
  loadFromIntrospectionButton: () => requestPane(page).getByRole('button', { name: 'Load from Introspection' }),
  schemaLoadedToast: () => page.getByRole('status').getByText('GraphQL Schema loaded successfully'),
  queryBuilderTree: () => requestPane(page).getByRole('treeitem').first(),
  rootType: (name: string) => requestPane(page).getByRole('button', { name: new RegExp(`^${name}\\b`) }),
  field: (name: string) => requestPane(page).getByRole('treeitem', { name: named(name) }),
  fieldName: (name: string) => requestPane(page).getByRole('treeitem', { name: named(name) }).getByText(name, { exact: true })
});

const readCodeMirrorValue = async (editor: Locator): Promise<string> => {
  await editor.waitFor({ state: 'visible' });
  return editor.evaluate((editorElement) => (editorElement as any).CodeMirror?.getValue() ?? '');
};

const writeCodeMirrorValue = async (editor: Locator, value: string) => {
  await editor.waitFor({ state: 'visible' });
  await editor.evaluate((editorElement, nextValue) => {
    (editorElement as any).CodeMirror.setValue(nextValue);
  }, value);
};

const selectGraphqlRequestTab = async (page: Page, key: string) => {
  const gql = buildGraphqlAuthIntrospectionLocators(page);
  const tab = gql.requestTab(key);

  await tab.click();
  await expect(tab).toHaveText(key === graphqlRequestTab.query ? 'Query' : 'Auth');
};

/**
 * Replace the GraphQL query in the open request.
 * @param page - The page object
 * @param query - The query document to write
 */
export const setGraphqlQuery = async (page: Page, query: string) => {
  await test.step('Set the GraphQL query', async () => {
    await selectGraphqlRequestTab(page, graphqlRequestTab.query);
    await writeCodeMirrorValue(buildGraphqlAuthIntrospectionLocators(page).queryEditor(), query);
  });
};

/**
 * Open the variables pane if needed and replace the GraphQL variables.
 * @param page - The page object
 * @param variables - The variables JSON to write
 */
export const setGraphqlVariables = async (page: Page, variables: string) => {
  await test.step('Set the GraphQL variables', async () => {
    await selectGraphqlRequestTab(page, graphqlRequestTab.query);
    const gql = buildGraphqlAuthIntrospectionLocators(page);
    const editor = gql.variablesEditor();
    if (await editor.isVisible()) {
      await writeCodeMirrorValue(editor, variables);
      return;
    }
    await gql.variablesHeader().click();
    await editor.waitFor({ state: 'visible' });
    await writeCodeMirrorValue(editor, variables);
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
  await gql.variablesHeader().click();
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
    await selectGraphqlRequestTab(page, graphqlRequestTab.auth);
    const gql = buildGraphqlAuthIntrospectionLocators(page);

    await gql.authModeLabel().click();
    await gql.apiKeyModeOption().click();
    await gql.authFieldEditor(authField.key).waitFor({ state: 'visible' });

    await writeCodeMirrorValue(gql.authFieldEditor(authField.key), auth.key);
    await writeCodeMirrorValue(gql.authFieldEditor(authField.value), auth.value);

    await gql.placementLabel().click();
    await gql.placementOption(auth.addTo).click();
    await expect(gql.placementLabel()).toHaveText(auth.addTo);
  });
};

/** Read the text stored in the API Key field named by label. */
export const readGraphqlAuthField = async (page: Page, label: string): Promise<string> => {
  const gql = buildGraphqlAuthIntrospectionLocators(page);
  const editor = gql.authFieldEditor(label);
  return readCodeMirrorValue(editor);
};

export const oauthField = {
  clientId: 'Client ID',
  clientSecret: 'Client Secret'
};

export const oauthGrantType = {
  clientCredentials: 'Client Credentials'
};

export type GraphqlOAuth2ClientCredentials = {
  clientId: string;
  clientSecret: string;
};

/**
 * Select OAuth 2.0 Client Credentials and fill the client id and secret.
 * Both values may contain `{{variable}}` tokens.
 * @param page - The page object
 * @param auth - Client id and client secret
 */
export const configureGraphqlOAuth2ClientCredentials = async (page: Page, auth: GraphqlOAuth2ClientCredentials) => {
  await test.step('Configure OAuth 2.0 Client Credentials auth', async () => {
    await selectGraphqlRequestTab(page, graphqlRequestTab.auth);
    const gql = buildGraphqlAuthIntrospectionLocators(page);
    const grantType = page.getByTestId('grant-type-dropdown');

    await gql.authModeLabel().click();
    await page.getByTestId('auth-mode-dropdown-oauth2').click();
    await expect(grantType).toContainText('Authorization Code');

    await grantType.click();
    await page.getByTestId('grant-type-dropdown-client_credentials').click();
    await expect(grantType).toContainText(oauthGrantType.clientCredentials);

    const clientId = gql.authFieldEditor(oauthField.clientId);
    await clientId.waitFor({ state: 'visible' });
    await writeCodeMirrorValue(clientId, auth.clientId);
    await writeCodeMirrorValue(gql.authFieldEditor(oauthField.clientSecret), auth.clientSecret);
  });
};

export const digestField = {
  username: 'Username',
  password: 'Password'
};

export type GraphqlDigestAuth = {
  username: string;
  password: string;
};

/**
 * Select Digest auth and fill the username and password.
 * Both values may contain `{{variable}}` tokens.
 * @param page - The page object
 * @param auth - Digest username and password
 */
export const configureGraphqlDigestAuth = async (page: Page, auth: GraphqlDigestAuth) => {
  await test.step('Configure Digest auth', async () => {
    await selectGraphqlRequestTab(page, graphqlRequestTab.auth);
    const gql = buildGraphqlAuthIntrospectionLocators(page);

    await gql.authModeLabel().click();
    await page.getByTestId('auth-mode-dropdown-digest').click();

    const username = gql.authFieldEditor(digestField.username);
    await username.waitFor({ state: 'visible' });
    await writeCodeMirrorValue(username, auth.username);
    await writeCodeMirrorValue(gql.authFieldEditor(digestField.password), auth.password);
  });
};

export const bearerField = {
  token: 'Token'
};

export type GraphqlBearerAuth = {
  token: string;
};

/**
 * Select Bearer Token auth and fill the token.
 * The token may contain a `{{variable}}` token.
 * @param page - The page object
 * @param auth - Bearer token
 */
export const configureGraphqlBearerAuth = async (page: Page, auth: GraphqlBearerAuth) => {
  await test.step('Configure Bearer Token auth', async () => {
    await selectGraphqlRequestTab(page, graphqlRequestTab.auth);
    const gql = buildGraphqlAuthIntrospectionLocators(page);

    await gql.authModeLabel().click();
    await page.getByTestId('auth-mode-dropdown-bearer').click();

    const token = gql.authFieldEditor(bearerField.token);
    await token.waitFor({ state: 'visible' });
    await writeCodeMirrorValue(token, auth.token);
  });
};

export const basicField = {
  username: 'Username',
  password: 'Password'
};

export type GraphqlBasicAuth = {
  username: string;
  password: string;
};

/**
 * Select Basic auth and fill the username and password.
 * Both values may contain `{{variable}}` tokens.
 * @param page - The page object
 * @param auth - Basic username and password
 */
export const configureGraphqlBasicAuth = async (page: Page, auth: GraphqlBasicAuth) => {
  await test.step('Configure Basic auth', async () => {
    await selectGraphqlRequestTab(page, graphqlRequestTab.auth);
    const gql = buildGraphqlAuthIntrospectionLocators(page);

    await gql.authModeLabel().click();
    await page.getByTestId('auth-mode-dropdown-basic').click();

    const username = gql.authFieldEditor(basicField.username);
    await username.waitFor({ state: 'visible' });
    await writeCodeMirrorValue(username, auth.username);
    await writeCodeMirrorValue(gql.authFieldEditor(basicField.password), auth.password);
  });
};

/**
 * Show the Query Builder for the open GraphQL request.
 * @param page - The page object
 */
export const openGraphqlQueryBuilder = async (page: Page) => {
  await test.step('Open the Query Builder', async () => {
    await selectGraphqlRequestTab(page, graphqlRequestTab.query);
    const gql = buildGraphqlAuthIntrospectionLocators(page);
    const showButton = gql.showQueryBuilderButton();
    if (await showButton.isVisible()) {
      await showButton.click();
    }
    await gql.queryBuilder().waitFor({ state: 'visible' });
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
 * @param fieldName - The schema field to expand
 */
export const expandGraphqlSchemaField = async (page: Page, fieldName: string) => {
  await test.step(`Expand schema field "${fieldName}"`, async () => {
    const gql = buildGraphqlAuthIntrospectionLocators(page);
    const field = gql.field(fieldName);
    const name = gql.fieldName(fieldName);
    await field.waitFor({ state: 'visible' });

    if ((await field.getAttribute('aria-expanded')) === 'true') {
      await expect(name).toBeVisible();
      await expect(name).toHaveText(fieldName);
      return;
    }

    await name.click();
    await expect(field).toHaveAttribute('aria-expanded', 'true');
    await expect(field).toContainText(fieldName);
    await expect(name).toHaveText(fieldName);
  });
};
