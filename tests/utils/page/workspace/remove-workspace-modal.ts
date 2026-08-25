import { Page } from '../../../../playwright';

/**
 * Remove Workspace modal locators.
 */
export const buildRemoveWorkspaceModalLocators = (page: Page) => {
  const modal = () => page.getByTestId('remove-workspace-modal');

  return {
    modal,
    // The label switches to "Removing..." mid-submit, so target the button by testid.
    submitButton: () => page.getByTestId('remove-workspace-modal-submit-btn')
  };
};
