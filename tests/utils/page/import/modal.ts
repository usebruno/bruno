import { Page } from '../../../../playwright';

/**
 * Locators for the Import Collection modal tabs and source inputs.
 */
export const buildImportModalLocators = (page: Page) => {
  const importModal = () => page.getByTestId('import-collection-modal');

  return {
    modalTitle: () => importModal().getByTestId('import-collection-header-title'),
    fileTab: () => importModal().getByTestId('file-tab'),
    gitRepositoryTab: () => importModal().getByTestId('github-tab'),
    urlTab: () => importModal().getByTestId('url-tab'),
    gitUrlInput: () => importModal().getByTestId('git-url-input'),
    urlInput: () => importModal().getByTestId('url-input'),
    cloneGitButton: () => importModal().getByTestId('clone-git-button'),
    importUrlButton: () => importModal().getByTestId('import-url-button'),
    loader: () => page.getByTestId('import-collection-loader'),
    chooseFilesButton: () => importModal().getByTestId('import-choose-files-button')
  };
};
