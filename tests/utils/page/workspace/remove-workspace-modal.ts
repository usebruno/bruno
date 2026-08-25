import { Page } from '../../../../playwright';

/**
 * Remove Workspace modal locators.
 */
export const buildRemoveWorkspaceModalLocators = (page: Page) => {
  const modal = () => page.getByTestId('remove-workspace-modal');

  return {
    modal,
    submitButton: () => page.getByTestId('remove-workspace-modal-submit-btn')
  };
};
