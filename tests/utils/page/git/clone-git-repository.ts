import { Locator, Page, expect } from '../../../../playwright';
import { buildCommonLocators } from '../locators';

// Locators and actions for the Clone Git Repository dialog
export const buildCloneGitRepositoryLocators = (page: Page) => {
  const modal = (): Locator =>
    page
      .locator('.bruno-modal-card')
      .filter({ has: page.locator('.bruno-modal-header-title', { hasText: 'Clone Git Repository' }) });
  const branchOptions = (): Locator => page.getByRole('listbox').locator('.dropdown-item');

  return {
    modal,
    branchOptions,
    branchSelect: (): Locator => modal().getByTestId('clone-git-repository-branch-select'),
    branchSearchInput: (): Locator => modal().locator('.select-search-input'),
    branchOption: (branchName: string): Locator => branchOptions().filter({ hasText: branchName }),
    noBranchesFound: (): Locator => page.getByText('No branches match your search'),
    branchListingFailed: (): Locator => modal().getByText('Branches could not be listed for this repository'),
    button: (name: string): Locator => modal().getByRole('button', { name })
  };
};

export const openCloneDialogFromImport = async (page: Page, repositoryUrl: string) => {
  const locators = buildCommonLocators(page);
  const { modal } = buildCloneGitRepositoryLocators(page);

  await locators.plusMenu.button().click();
  await locators.plusMenu.importCollection().click();

  const importModal = locators.import.modal();
  await importModal.waitFor({ state: 'visible', timeout: 10000 });

  await importModal.getByTestId('github-tab').click();
  await importModal.getByTestId('git-url-input').fill(repositoryUrl);
  await importModal.locator('#clone-git-button').click();

  await modal().waitFor({ state: 'visible', timeout: 10000 });
  await expect(modal()).toContainText(repositoryUrl);
};
