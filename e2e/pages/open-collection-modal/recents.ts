import { test, Page } from '../../playwright';
import { buildCollectionListLocators } from './collection-list';

export const buildRecentsLocators = (page: Page) => {
  const emptyState = () => page.getByTestId('recents-empty');

  return {
    ...buildCollectionListLocators(page, 'recents'),
    emptyState,
    emptyStateTitle: () => emptyState().getByRole('heading'),
    openFolderButton: () => page.getByTestId('recents-open-folder')
  };
};

export const selectRecentCollections = async (page: Page, names: string[]) => {
  await test.step(`Select "${names.join('", "')}" in Recents`, async () => {
    const recents = buildRecentsLocators(page);
    for (const name of names) {
      await recents.row(name).click();
    }
  });
};

export const openRecentCollection = async (page: Page, name: string) => {
  await test.step(`Reopen "${name}" from its Recents row`, async () => {
    const recents = buildRecentsLocators(page);
    await recents.row(name).hover();
    await recents.rowOpenButton(name).click({ force: true });
  });
};

export const switchToRecentCollection = async (page: Page, name: string) => {
  await test.step(`Go to "${name}" from its Recents row`, async () => {
    const recents = buildRecentsLocators(page);
    await recents.row(name).hover();
    await recents.rowSwitchButton(name).click({ force: true });
  });
};
