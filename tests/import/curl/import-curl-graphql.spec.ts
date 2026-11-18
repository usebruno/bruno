import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  getGraphqlQueryEditorValue,
  openGraphqlVariablesPane,
  readEditorValue
} from '../../utils/page';
import { createRequestFromCurl } from '../../utils/request';
import {
  GRAPHQL_CURL,
  GRAPHQL_CURL_QUERY,
  GRAPHQL_CURL_URL,
  GRAPHQL_CURL_VARIABLES_EDITOR_TEXT,
  STRING_VARIABLES_GRAPHQL_CURL
} from '../../utils/constants';

const REQUEST_NAME = 'company';

const importGraphqlRequestFromCurl = async (page: Page, collectionName: string, collectionLocation: string, curl: string) => {
  await createCollection(page, collectionName, collectionLocation);
  await createRequestFromCurl(page, REQUEST_NAME, curl, collectionName);
  await openGraphqlVariablesPane(page);
};

test.describe('cURL import — GraphQL', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('New Request from cURL creates a GraphQL request with the URL, query and variables', async ({ page, createTmpDir }) => {
    const { request, graphqlVariables } = buildCommonLocators(page);
    await importGraphqlRequestFromCurl(page, 'curl-graphql', await createTmpDir('curl-graphql'), GRAPHQL_CURL);

    await test.step('The request holds the URL, query and variables from the cURL', async () => {
      await expect(request.urlLine()).toHaveText(GRAPHQL_CURL_URL);
      await expect.poll(() => getGraphqlQueryEditorValue(page)).toBe(GRAPHQL_CURL_QUERY);
      await expect.poll(() => readEditorValue(graphqlVariables.editor())).toBe(GRAPHQL_CURL_VARIABLES_EDITOR_TEXT);
    });
  });

  test('New Request from cURL unwraps string-encoded variables from an older Bruno export instead of encoding them again', async ({
    page,
    createTmpDir
  }) => {
    const { graphqlVariables } = buildCommonLocators(page);
    await importGraphqlRequestFromCurl(
      page,
      'curl-graphql-string-variables',
      await createTmpDir('curl-graphql-string-variables'),
      STRING_VARIABLES_GRAPHQL_CURL
    );

    await test.step('The Variables editor holds the JSON object, not a quoted string', async () => {
      await expect.poll(() => readEditorValue(graphqlVariables.editor())).toBe(GRAPHQL_CURL_VARIABLES_EDITOR_TEXT);
    });
  });
});
