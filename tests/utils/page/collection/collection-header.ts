import { Page } from '../../../../playwright';

/**
 * Builds locators for collection header components like the environment selector dropdown.
 */
export const buildCollectionHeaderLocators = (page: Page) => ({
  runner: () => page.getByTestId('runner'),
  sandboxModeSelector: () => page.getByTestId('sandbox-mode-selector'),
  collectionSettingsDropdown: () => page.getByTestId('more-actions'),
  envSelectorTrigger: () => page.getByTestId('environment-selector-trigger')
});
