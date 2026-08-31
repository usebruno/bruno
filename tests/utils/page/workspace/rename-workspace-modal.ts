import { Page } from '../../../../playwright';

/**
 * Rename Workspace modal locators.
 */
export const buildRenameWorkspaceModalLocators = (page: Page) => {
  const modal = () => page.getByTestId('rename-workspace-modal');

  return {
    modal,
    nameInput: () => modal().getByTestId('workspace-name-input'),
    error: () => modal().getByTestId('workspace-name-error'),
    submitButton: () => page.getByTestId('rename-workspace-modal-submit-btn')
  };
};
