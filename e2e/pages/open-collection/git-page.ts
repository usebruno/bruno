import { Locator, Page, test } from '../../playwright';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildGitPageLocators = (page: Page) => {
  const panel = (): Locator => page.getByTestId('open-collection-git-panel-git-url');
  const collectionList = (): Locator => panel().getByTestId('selection-list');
  const collectionRows = (): Locator => collectionList().getByRole('listitem');
  const skippedWarning = (): Locator => panel().getByTestId('skipped-paths-warning');

  return {
    panel,
    urlInput: (): Locator => panel().getByTestId('clone-git-repository-url'),
    urlHint: (): Locator => panel().getByTestId('clone-git-repository-url-hint'),
    locationInput: (): Locator => panel().getByLabel('Clone to location', { exact: true }),
    branchSelect: (): Locator => panel().getByTestId('clone-git-repository-branch-select'),
    // The branch list is attached to document.body, outside the panel
    branchList: (): Locator => page.getByTestId('clone-git-repository-branch-select-listbox'),
    inlineBody: (): Locator => panel().getByTestId('clone-git-inline-body'),
    inlineFooter: (): Locator => panel().getByTestId('clone-git-inline-footer'),
    confirmButton: (): Locator => panel().getByTestId('clone-git-inline-confirm'),
    cancelButton: (): Locator => panel().getByTestId('clone-git-inline-cancel'),
    selectedCount: (): Locator => panel().getByTestId('clone-git-selected-count'),
    skippedWarning,
    skippedDetailsButton: (): Locator => skippedWarning().getByRole('button', { name: 'View Details', exact: true }),
    skippedPath: (name: string): Locator => skippedWarning().getByTestId('skipped-paths-warning-item').filter({ hasText: name }),
    collectionList,
    collectionRows,
    collectionCheckbox: (name: string): Locator =>
      collectionRows()
        .filter({ has: page.getByTestId('selection-item-title').filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) }) })
        .getByRole('checkbox'),
    collectionRow: (name: string): Locator =>
      collectionRows().filter({
        has: page.getByTestId('selection-item-title').filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) })
      })
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

export const getFormFieldHeights = async (page: Page): Promise<number[]> => {
  const gitPage = buildGitPageLocators(page);
  const fields = [gitPage.urlInput(), gitPage.locationInput(), gitPage.branchSelect()];
  await Promise.all(fields.map((field) => field.waitFor({ state: 'visible' })));
  const boxes = await Promise.all(fields.map((field) => field.boundingBox()));
  return boxes.map((box) => box?.height ?? 0);
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

const isScrollable = (locator: Locator): Promise<boolean> =>
  locator.evaluate((element) => element.scrollHeight > element.clientHeight);

export const isGitPagePanelScrollable = (page: Page): Promise<boolean> => isScrollable(buildGitPageLocators(page).panel());

export const isInlineBodyScrollable = (page: Page): Promise<boolean> => isScrollable(buildGitPageLocators(page).inlineBody());

export const isCollectionListScrollable = (page: Page): Promise<boolean> =>
  isScrollable(buildGitPageLocators(page).collectionList());

export const isBranchListScrollable = (page: Page): Promise<boolean> => isScrollable(buildGitPageLocators(page).branchList());

export const getCollectionListAndFooterEdges = async (page: Page) => {
  const gitPage = buildGitPageLocators(page);
  const list = await gitPage.collectionList().boundingBox();
  const footer = await gitPage.inlineFooter().boundingBox();
  return { listBottom: list.y + list.height, footerTop: footer.y };
};

export const getCollectionListAndSkippedWarningEdges = async (page: Page) => {
  const gitPage = buildGitPageLocators(page);
  const list = await gitPage.collectionList().boundingBox();
  const warning = await gitPage.skippedWarning().boundingBox();
  return { listBottom: list.y + list.height, warningTop: warning.y };
};

export const countCollectionRowsInView = async (page: Page): Promise<number> => {
  const locators = buildGitPageLocators(page);
  const listBox = await locators.collectionList().boundingBox();
  if (!listBox) {
    return 0;
  }
  return locators.collectionRows().evaluateAll((rows, list) => {
    const top = Math.max(0, list.y);
    const bottom = Math.min(window.innerHeight, list.y + list.height);
    return rows.filter((row) => {
      const rect = row.getBoundingClientRect();
      return rect.top >= top && rect.bottom <= bottom;
    }).length;
  }, listBox);
};
