import { Page } from '../../../../playwright';

/**
 * Builds locators for collection header components like the environment selector dropdown.
 */
export const buildCollectionHeaderLocators = (page: Page) => {
  const collectionHeader = page.getByTestId('collection-header');
  return {
    runner: () => collectionHeader.getByTestId('runner'),
    sandboxModeSelector: () => collectionHeader.getByTestId('sandbox-mode-selector'),
    overflowMenu: () => collectionHeader.getByTestId('more-actions'),
    overflowMenuItem: (itemId: string) => page.getByTestId(`more-actions-${itemId}`),
    envSelectorTrigger: () => collectionHeader.getByTestId('environment-selector-trigger')
  };
};
