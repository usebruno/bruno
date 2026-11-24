import { Page } from '../../playwright';

export const buildDeleteWorkspaceModalLocators = (page: Page) => {
  const modal = () => page.getByTestId('delete-workspace-modal');

  return {
    modal,
    confirmInput: () => modal().getByPlaceholder('delete'),
    submitButton: () => page.getByTestId('delete-workspace-modal-submit-btn')
  };
};
