import { test, expect } from '../../../playwright';
import {
  buildRunnerLocators,
  dragSidebarToWidth,
  findToolbarCollapseSidebarWidth,
  MIN_SIDEBAR_WIDTH,
  runCollection,
  setWindowContentSize
} from '../../utils/page';

const collectionName = 'Runner Responsive Toolbar';
const wideWindowSize = { width: 1150, height: 800 };
const narrowWindowSize = { width: 900, height: 800 };

test.describe('Runner toolbar collapse', () => {
  test('folds the filter buttons into a dropdown that still shows the counts', async ({ pageWithUserData: page, reuseOrLaunchElectronApp }, testInfo) => {
    const locators = buildRunnerLocators(page);

    await setWindowContentSize(await reuseOrLaunchElectronApp({ testFile: testInfo.file }), page, wideWindowSize);

    await runCollection(page, collectionName);

    await test.step('Beside the narrowest sidebar, the toolbar shows the filter buttons', async () => {
      await dragSidebarToWidth(page, MIN_SIDEBAR_WIDTH);
      await expect(locators.filterButton('all')).toBeVisible();
      await expect(locators.filterSelect()).toBeHidden();
    });

    await findToolbarCollapseSidebarWidth(page, 'compact');

    await test.step('The filter buttons give way to the select while the actions keep their labels', async () => {
      await expect(locators.filterButton('all')).toBeHidden();
      await expect(locators.filterSelect()).toBeVisible();
      await expect(locators.filterSelect()).toHaveText(/All\s*1/);
      await expect(locators.toolbar()).not.toHaveClass(/\btiny\b/);
      await expect(locators.runAgainButton().getByText('Run Again')).toBeVisible();
    });

    await test.step('The dropdown lists every filter with its count', async () => {
      await locators.filterSelect().click();
      await expect(locators.filterOption('All')).toContainText('1');
      await expect(locators.filterOption('Passed')).toContainText('1');
      await expect(locators.filterOption('Failed')).toContainText('0');
      await expect(locators.filterOption('Skipped')).toContainText('0');
      await page.keyboard.press('Escape');
      await expect(locators.filterOption('All')).toBeHidden();
    });
  });

  test('drops the action labels when the collapsed filter still does not fit', async ({ pageWithUserData: page, reuseOrLaunchElectronApp }, testInfo) => {
    const locators = buildRunnerLocators(page);

    await setWindowContentSize(await reuseOrLaunchElectronApp({ testFile: testInfo.file }), page, narrowWindowSize);

    await runCollection(page, collectionName);
    await findToolbarCollapseSidebarWidth(page, 'tiny');

    await test.step('The actions show icons only but keep their accessible names', async () => {
      await expect(locators.filterSelect()).toBeVisible();
      await expect(locators.runAgainButton()).toBeVisible();
      await expect(locators.runAgainButton().getByText('Run Again')).toBeHidden();
      await expect(locators.resetButton()).toBeVisible();
      await expect(locators.resetButton().getByText('Reset')).toBeHidden();
    });

    await test.step('An icon-only action still works', async () => {
      await locators.resetButton().click();
      await expect(locators.runCollectionButton()).toBeVisible();
    });
  });

  test('collapses at a width set by the actions on show, not a fixed breakpoint', async ({ pageWithUserData: page, reuseOrLaunchElectronApp }, testInfo) => {
    const locators = buildRunnerLocators(page);

    await setWindowContentSize(await reuseOrLaunchElectronApp({ testFile: testInfo.file }), page, narrowWindowSize);

    await runCollection(page, collectionName);
    const endedCollapseWidth = await findToolbarCollapseSidebarWidth(page, 'tiny');

    await test.step('At that width, the lone Cancel action mid-run still fits its label', async () => {
      await locators.runAgainButton().click();
      await expect(locators.cancelExecutionButton()).toBeVisible();
      await expect(locators.cancelExecutionButton().getByText('Cancel Execution')).toBeVisible();
      await expect(locators.toolbar()).not.toHaveClass(/\btiny\b/);
    });

    const runningCollapseWidth = await findToolbarCollapseSidebarWidth(page, 'tiny');

    await test.step('Cancel alone needs a wider sidebar to collapse than Run Again with Reset', async () => {
      expect(runningCollapseWidth).toBeGreaterThan(endedCollapseWidth);
    });

    await test.step('When the run ends at the Run Again + Reset width, the toolbar collapses on its own', async () => {
      await dragSidebarToWidth(page, endedCollapseWidth);
      await expect(locators.cancelExecutionButton().getByText('Cancel Execution')).toBeVisible();
      await expect(locators.runAgainButton()).toBeVisible({ timeout: 15000 });
      await expect(locators.toolbar()).toHaveClass(/\btiny\b/);
    });
  });
});
