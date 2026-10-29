import { test, expect } from '../../../playwright';
import { buildCommonLocators, openRequest, selectScriptSubTab, setWindowContentSize } from '../../utils/page';

const COLLECTION_NAME = 'ScriptSubTabsOverflow';
const REQUEST_NAME = 'LifecycleHooks';
const GRPC_HOOKS = ['before-call-start', 'before-message-send', 'after-message-receive', 'after-call-end'];

const windowSize = { width: 1000, height: 800 };

test.describe('Script sub-tabs overflow', () => {
  test('collapses gRPC hooks beside the response and shows them all when stacked', async ({ pageWithUserData: page, reuseOrLaunchElectronApp }, testInfo) => {
    const locators = buildCommonLocators(page);
    const overflowTrigger = locators.paneTabs.scriptSubTabsOverflowTrigger();

    const app = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    await setWindowContentSize(app, page, windowSize);
    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);

    await test.step('Side by side, the selected hook stays in the row while others collapse', async () => {
      await expect(locators.titleBar.responseLayoutToggle()).toHaveAttribute('title', 'Switch to vertical layout');

      await selectScriptSubTab(page, 'after-call-end');

      await expect(locators.paneTabs.tabTrigger('after-call-end')).toBeVisible();
      await expect(locators.paneTabs.tabTrigger('after-call-end')).toContainClass('active');
      await expect(overflowTrigger).toBeVisible();
      await expect(locators.paneTabs.tabTrigger('after-message-receive')).toHaveCount(0);
    });

    await test.step('Stacked, every hook is in the row and the selection is kept', async () => {
      await locators.titleBar.responseLayoutToggle().click();
      await expect(locators.titleBar.responseLayoutToggle()).toHaveAttribute('title', 'Switch to horizontal layout');

      for (const hook of GRPC_HOOKS) {
        await expect(locators.paneTabs.tabTrigger(hook)).toBeVisible();
      }
      await expect(overflowTrigger).toHaveCount(0);
      await expect(locators.paneTabs.tabTrigger('after-call-end')).toContainClass('active');
    });
  });
});
