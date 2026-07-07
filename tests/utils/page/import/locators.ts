import { Page } from '../../../../playwright';
import { buildBulkImportSelectionLocators } from './bulk-import';
import { buildCloneGitLocators } from './clone-git';
import { buildImportModalLocators } from './modal';

/**
 * Import locators added for BrowserStack import test automation.
 */
export const buildImportAddedLocators = (page: Page) => ({
  ...buildImportModalLocators(page),
  ...buildCloneGitLocators(page),
  ...buildBulkImportSelectionLocators(page)
});
