import { Page, test } from '../../playwright';

/**
 * Locators for the Global Search modal and the status-bar button that opens it.
 */
export const buildGlobalSearchLocators = (page: Page) => ({
  statusBarTrigger: () => page.getByRole('button', { name: 'Global Search', exact: true }),
  input: () => page.getByTestId('global-search-input')
});

export const closeGlobalSearch = async (page: Page) => {
  await test.step('Close Global Search', async () => {
    const { input } = buildGlobalSearchLocators(page);
    // Escape is handled by the input, so focus it directly rather than wait for the modal's delayed autofocus.
    await input().press('Escape');
    await input().waitFor({ state: 'hidden' });
  });
};
