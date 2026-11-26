import { Page, expect, test } from '../../playwright';

/**
 * Locators for the collapsible Variables pane under a GraphQL request's query editor.
 */
export const buildGraphqlVariablesLocators = (page: Page) => ({
  toggle: () => page.getByTestId('graphql-variables-toggle'),
  editor: () => page.getByTestId('graphql-variables-editor').locator('.CodeMirror').first()
});

export const openGraphqlVariablesPane = async (page: Page) => {
  await test.step('Open the GraphQL Variables pane', async () => {
    const variables = buildGraphqlVariablesLocators(page);
    if ((await variables.toggle().getAttribute('aria-expanded')) !== 'true') {
      await variables.toggle().click();
    }
    await expect(variables.editor()).toBeVisible();
  });
};
