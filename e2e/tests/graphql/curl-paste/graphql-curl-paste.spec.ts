import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closeAllTabs,
  closeGenerateCodeDialog,
  createCollection,
  createRequest,
  getGeneratedSnippet,
  getGraphqlQueryEditorValue,
  pasteIntoEditor,
  readEditorValue,
  saveRequest
} from '../../../pages';
import {
  GRAPHQL_CURL,
  GRAPHQL_CURL_EXPORTED_VARIABLES,
  GRAPHQL_CURL_QUERY,
  GRAPHQL_CURL_URL,
  GRAPHQL_CURL_VARIABLES_EDITOR_TEXT,
  STRING_VARIABLES_GRAPHQL_CURL
} from '../../../constants';
import { openGraphqlVariablesPane, buildGraphqlVariablesLocators } from '../../../pages/request/graphql-variables';

const REQUEST_NAME = 'company';

const createGraphqlRequestFromPastedCurl = async (
  page: Page,
  collectionName: string,
  collectionLocation: string,
  curl = GRAPHQL_CURL
) => {
  const locators = buildCommonLocators(page);

  await test.step('Create a GraphQL request', async () => {
    await createCollection(page, collectionName, collectionLocation);
    await createRequest(page, REQUEST_NAME, collectionName, { requestType: 'graphql' });
    await locators.sidebar.request(REQUEST_NAME).click();
    await locators.tabs.requestTab(REQUEST_NAME).waitFor({ state: 'visible' });
  });

  await test.step('Paste the cURL command into the URL bar', async () => {
    await pasteIntoEditor(locators.request.urlInput(), curl);
  });
};

test.describe('GraphQL request — cURL pasted into the URL bar', () => {
  test.afterEach(async ({ page }) => {
    await closeGenerateCodeDialog(page);
    await closeAllCollections(page);
  });

  test('fills the URL, query and variables from the pasted cURL', async ({ page, createTmpDir }) => {
    const { request } = buildCommonLocators(page);
    const graphqlVariables = buildGraphqlVariablesLocators(page);
    await createGraphqlRequestFromPastedCurl(page, 'graphql-curl-paste', await createTmpDir('graphql-curl-paste'));

    await test.step('Open the Variables pane', async () => {
      await openGraphqlVariablesPane(page);
    });

    await test.step('The request holds the URL, query and variables from the cURL', async () => {
      await expect(request.urlLine()).toHaveText(GRAPHQL_CURL_URL);
      await expect.poll(() => getGraphqlQueryEditorValue(page)).toBe(GRAPHQL_CURL_QUERY);
      await expect.poll(() => readEditorValue(graphqlVariables.editor())).toBe(GRAPHQL_CURL_VARIABLES_EDITOR_TEXT);
    });
  });

  test('unwraps string-encoded variables from an older Bruno export instead of encoding them again', async ({
    page,
    createTmpDir
  }) => {
    const graphqlVariables = buildGraphqlVariablesLocators(page);
    await createGraphqlRequestFromPastedCurl(
      page,
      'graphql-curl-string-variables',
      await createTmpDir('graphql-curl-string-variables'),
      STRING_VARIABLES_GRAPHQL_CURL
    );

    await openGraphqlVariablesPane(page);

    await test.step('The Variables editor holds the JSON object, not a quoted string', async () => {
      await expect.poll(() => readEditorValue(graphqlVariables.editor())).toBe(GRAPHQL_CURL_VARIABLES_EDITOR_TEXT);
    });
  });

  test('saves the pasted variables and shows them after the request is reopened', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const graphqlVariables = buildGraphqlVariablesLocators(page);
    await createGraphqlRequestFromPastedCurl(page, 'graphql-curl-save', await createTmpDir('graphql-curl-save'));

    await saveRequest(page);

    await test.step('Reopen the saved request', async () => {
      await closeAllTabs(page);
      await sidebar.request(REQUEST_NAME).click();
      await openGraphqlVariablesPane(page);
    });

    await test.step('The Variables editor holds the saved variables', async () => {
      await expect.poll(() => readEditorValue(graphqlVariables.editor())).toBe(GRAPHQL_CURL_VARIABLES_EDITOR_TEXT);
    });
  });

  test('Generate Code exports the pasted variables as a JSON object', async ({ page, createTmpDir }) => {
    await createGraphqlRequestFromPastedCurl(page, 'graphql-curl-export', await createTmpDir('graphql-curl-export'));

    const snippet = await getGeneratedSnippet(page);

    await test.step('The cURL snippet nests the variables as JSON, not as an escaped string', async () => {
      expect(snippet).toContain(GRAPHQL_CURL_URL);
      expect(snippet).toContain(GRAPHQL_CURL_EXPORTED_VARIABLES);
    });
  });
});
