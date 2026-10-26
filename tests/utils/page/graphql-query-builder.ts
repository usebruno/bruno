import { ElectronApplication, Page, expect, test } from '../../../playwright';
import { buildCommonLocators } from './locators';

/**
 * GraphQL Query Builder locators. Field rows are keyed by their schema path, e.g. `Query.user.name`.
 */
export const buildGraphqlQueryBuilderLocators = (page: Page) => ({
  container: () => page.getByTestId('graphql-query-builder'),
  toggleButton: () => page.getByTestId('graphql-query-builder-toggle'),
  actionsButton: () => page.getByTestId('graphql-query-actions'),
  loadSchemaFromFileItem: () => page.getByTestId('menu-dropdown-schema-file'),
  field: (path: string) => page.getByTestId(`query-builder-field-${path}`),
  fieldCheckbox: (path: string) => page.getByTestId(`query-builder-field-${path}`).getByTestId('query-builder-field-checkbox'),
  queryEditor: () => page.getByTestId('graphql-query-editor').locator('.CodeMirror').first()
});

export const openGraphqlQueryBuilder = async (page: Page) => {
  await test.step('Open the GraphQL Query Builder', async () => {
    const queryBuilder = buildGraphqlQueryBuilderLocators(page);
    if (!(await queryBuilder.container().isVisible())) {
      await queryBuilder.toggleButton().click();
    }
    await expect(queryBuilder.container()).toBeVisible();
  });
};

/**
 * Load a GraphQL schema through "Load from File", with the native file picker stubbed to `schemaPath`.
 * `rootField` is a root field path that must show up once the schema is loaded, e.g. `Query.user`.
 */
export const loadGraphqlSchemaFromFile = async (
  page: Page,
  electronApp: ElectronApplication,
  schemaPath: string,
  rootField: string
) => {
  await test.step('Load the GraphQL schema from file', async () => {
    const queryBuilder = buildGraphqlQueryBuilderLocators(page);
    await electronApp.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] });
    }, schemaPath);

    await queryBuilder.actionsButton().click();
    await queryBuilder.loadSchemaFromFileItem().click();
    await expect(queryBuilder.field(rootField)).toBeVisible();
  });
};

export const tickQueryBuilderField = async (page: Page, path: string) => {
  const checkbox = buildGraphqlQueryBuilderLocators(page).fieldCheckbox(path);
  await checkbox.check();
  await expect(checkbox).toBeChecked();
};

export const getGraphqlQueryEditorValue = async (page: Page) => {
  const editor = buildGraphqlQueryBuilderLocators(page).queryEditor();
  await expect(editor).toBeVisible();
  return await editor.evaluate((el) => (el as any).CodeMirror.getValue()) as string;
};

export const setGraphqlQueryEditorValue = async (page: Page, value: string) => {
  const editor = buildGraphqlQueryBuilderLocators(page).queryEditor();
  await expect(editor).toBeVisible();
  await editor.evaluate((el, val) => (el as any).CodeMirror.setValue(val), value);
};

/**
 * Read the `query` a JSON echo endpoint sent back in the response body.
 */
export const getEchoedGraphqlQuery = async (page: Page) => {
  const responseEditor = buildCommonLocators(page).response.previewContainerCodeMirror();
  await expect(responseEditor).toBeVisible();
  const body = await responseEditor.evaluate((el) => (el as any).CodeMirror.getValue()) as string;
  return JSON.parse(body).query as string;
};
