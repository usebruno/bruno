import { Locator, Page, test } from '../../playwright';

export const buildGitPageLocators = (page: Page) => {
  const panel = (): Locator => page.getByTestId('open-collection-git-panel-git-url');
  const collectionList = (): Locator => panel().getByTestId('selection-list');

  return {
    modal: (): Locator => page.getByTestId('open-collection-modal'),
    panel,
    urlInput: (): Locator => panel().getByLabel('Git Repository URL'),
    locationInput: (): Locator => panel().getByLabel('Location', { exact: true }),
    branchSelect: (): Locator => panel().getByTestId('clone-git-repository-branch-select'),
    // The branch list is attached to document.body, outside the panel
    branchList: (): Locator => page.getByRole('listbox'),
    confirmButton: (): Locator => panel().getByTestId('clone-git-inline-confirm'),
    cancelButton: (): Locator => panel().getByTestId('clone-git-inline-cancel'),
    selectedCount: (): Locator => panel().getByTestId('clone-git-selected-count'),
    skippedWarning: (): Locator => panel().getByText(/were skipped because their config could not be read/),
    skippedDetailsButton: (): Locator => panel().getByRole('button', { name: 'View Details', exact: true }),
    skippedPath: (name: string): Locator => panel().getByRole('listitem').filter({ hasText: name }),
    collectionList,
    collectionRows: (): Locator => collectionList().getByRole('listitem')
  };
};

export const openGitPage = async (_page: Page) => {
  throw new Error('Open collection modal has no entry point yet');
};

export const openBranchList = async (page: Page) => {
  await test.step('Open the branch list', async () => {
    const gitPage = buildGitPageLocators(page);
    await gitPage.branchSelect().click();
    await gitPage.branchList().waitFor({ state: 'visible' });
  });
};

export const getBranchListPlacement = async (page: Page) => {
  const gitPage = buildGitPageLocators(page);
  const trigger = await gitPage.branchSelect().boundingBox();
  const list = await gitPage.branchList().boundingBox();
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  return {
    triggerBottom: trigger.y + trigger.height,
    listTop: list.y,
    listBottom: list.y + list.height,
    viewportHeight
  };
};

export const isGitPagePanelScrollable = (page: Page): Promise<boolean> =>
  buildGitPageLocators(page)
    .panel()
    .evaluate((element) => element.scrollHeight > element.clientHeight);

export const countCollectionRowsInView = (page: Page): Promise<number> =>
  buildGitPageLocators(page)
    .collectionRows()
    .evaluateAll((rows) => {
      const viewportHeight = window.innerHeight;
      return rows.filter((row) => {
        const rect = row.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= viewportHeight;
      }).length;
    });
