import { Locator, Page, expect } from '../../playwright';
import { buildCollectionsPlusMenuLocators } from './manage';
import { buildImportCollectionLocators } from './import';

const buildLocators = (page: Page) => ({
  plusMenu: buildCollectionsPlusMenuLocators(page),
  import: buildImportCollectionLocators(page)
});

// Locators and actions for the Clone Git Repository dialog
export const buildCloneGitRepositoryLocators = (page: Page) => {
  const modal = (): Locator =>
    page
      .locator('.bruno-modal-card')
      .filter({ has: page.locator('.bruno-modal-header-title', { hasText: 'Clone Git Repository' }) });
  const branchOptions = (): Locator => page.getByRole('listbox').locator('.dropdown-item');
  const collectionItem = (name: string): Locator =>
    modal().getByTestId('selection-list').getByRole('listitem').filter({
      has: page.getByText(name, { exact: true })
    });

  return {
    modal,
    branchOptions,
    locationInput: (): Locator => modal().getByTestId('clone-git-repository-location'),
    browseLink: (): Locator => modal().getByTestId('clone-git-repository-browse'),
    collectionHeading: (): Locator => modal().getByTestId('selection-heading'),
    collectionItem,
    collectionCheckbox: (name: string): Locator => collectionItem(name).getByRole('checkbox'),
    branchSelect: (): Locator => modal().getByTestId('clone-git-repository-branch-select'),
    branchSearchInput: (): Locator => modal().locator('.select-search-input'),
    branchOption: (branchName: string): Locator => branchOptions().filter({ hasText: branchName }),
    noBranchesFound: (): Locator => page.getByText('No branches match your search'),
    branchListingFailed: (): Locator => modal().getByText('Branches could not be listed for this repository'),
    button: (name: string): Locator => modal().getByRole('button', { name })
  };
};

export const openCloneDialogFromImport = async (page: Page, repositoryUrl: string) => {
  const locators = buildLocators(page);
  const { modal } = buildCloneGitRepositoryLocators(page);

  await locators.plusMenu.button().click();
  await locators.plusMenu.importCollection().click();

  const importModal = locators.import.modal();
  await importModal.waitFor({ state: 'visible', timeout: 10000 });

  await locators.import.gitRepositoryTab().click();
  await locators.import.gitUrlInput().fill(repositoryUrl);
  await locators.import.cloneGitButton().click();

  await modal().waitFor({ state: 'visible', timeout: 10000 });
  await expect(modal()).toContainText(repositoryUrl);
};
