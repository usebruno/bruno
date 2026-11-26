import { Locator, Page, test } from '../../playwright';
import { buildSidebarLocators } from '../sidebar/collection-tree';

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

export const openCloneDialogFromGitRemoteRow = async (page: Page, collectionName: string) => {
  await test.step(`Open the Clone Git Repository dialog from the "${collectionName}" git row`, async () => {
    const { modal } = buildCloneGitRepositoryLocators(page);
    await buildSidebarLocators(page).gitRemoteRow(collectionName).click();
    await modal().waitFor({ state: 'visible' });
  });
};
