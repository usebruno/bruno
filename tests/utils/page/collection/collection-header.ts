import { Page } from '../../../../playwright';

/**
 * Builds locators for collection header components like the environment selector dropdown.
 */
export const buildCollectionHeaderLocators = (page: Page) => {
  const collectionHeader = page.getByTestId('collection-header');
  return {
    runner: () => collectionHeader.getByTestId('runner'),
    sandboxModeSelector: () => collectionHeader.getByTestId('sandbox-mode-selector'),
    collectionSettingsDropdown: () => collectionHeader.getByTestId('more-actions'),
    envSelectorTrigger: () => collectionHeader.getByTestId('environment-selector-trigger')
  };
};
