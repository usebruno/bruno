import { test, expect, Page } from '../../playwright';
import { selectRequestPaneTab } from './pane';
import { buildPaneTabsLocators } from '../shared-ui/pane-tabs';
import { buildCodeMirrorLocators, editCodeMirrorEditor } from '../shared-ui/code-editor';

const buildLocators = (page: Page) => ({
  paneTabs: buildPaneTabsLocators(page),
  codeMirror: buildCodeMirrorLocators(page)
});

export type ScriptSubTab = 'pre-request' | 'post-response' | 'before-call-start' | 'before-message-send' | 'after-message-receive' | 'after-call-end';

/**
 * Navigate to a Script sub-tab (pre-request / post-response for http & graphql, the lifecycle
 * hooks for gRPC)
 * @param page - The page object
 * @param subTab - The sub-tab to select
 */
export const selectScriptSubTab = async (page: Page, subTab: ScriptSubTab) => {
  await test.step(`Select Script sub-tab "${subTab}"`, async () => {
    await selectRequestPaneTab(page, 'Script');
    const locators = buildLocators(page);
    const tabTrigger = locators.paneTabs.tabTrigger(subTab);
    const overflowTrigger = locators.paneTabs.scriptSubTabsOverflowTrigger();

    // The sub-tab row re-measures via ResizeObserver/rAF, so a trigger can detach mid-click.
    // Retry the whole sequence so a mid-action re-layout doesn't fail the test.
    await expect(async () => {
      if (await tabTrigger.isVisible()) {
        await tabTrigger.click({ timeout: 2000 });
        await expect(tabTrigger).toContainClass('active', { timeout: 2000 });
        return;
      }

      if (await overflowTrigger.isVisible()) {
        const item = locators.paneTabs.overflowItem(subTab);
        // The chevron toggles the menu, so clicking it again after a failed attempt would close it.
        if (!(await item.isVisible())) {
          await overflowTrigger.click({ timeout: 2000 });
        }
        await item.waitFor({ state: 'visible', timeout: 2000 });
        await item.click({ timeout: 2000 });
        // Selecting pulls the tab into the visible row, so its trigger exists again.
        await expect(tabTrigger).toContainClass('active', { timeout: 2000 });
        return;
      }

      throw new Error(`Script sub-tab "${subTab}" not found in visible tabs or overflow dropdown`);
    }).toPass({ timeout: 15000 });
  });
};

/**
 * Add a pre-request script (navigates to Script > Pre Request and replaces editor content)
 * @param page - The page object
 * @param content - The script content to add
 */
export const addPreRequestScript = async (page: Page, content: string) => {
  await test.step('Add pre-request script', async () => {
    await selectScriptSubTab(page, 'pre-request');
    await editCodeMirrorEditor(page, 'pre-request-script-editor', content);
  });
};

/**
 * Add a post-response script (navigates to Script > Post Response and replaces editor content)
 * @param page - The page object
 * @param content - The script content to add
 */
export const addPostResponseScript = async (page: Page, content: string) => {
  await test.step('Add post-response script', async () => {
    await selectScriptSubTab(page, 'post-response');
    await editCodeMirrorEditor(page, 'post-response-script-editor', content);
  });
};

/**
 * Write a script into a Script sub-tab (navigates to the sub-tab and replaces editor content)
 * @param page - The page object
 * @param subTab - The Script sub-tab to author
 * @param content - The script content to add
 */
export const writeScriptContent = async (page: Page, subTab: ScriptSubTab, content: string) => {
  await test.step(`Add ${subTab} script`, async () => {
    await selectScriptSubTab(page, subTab);
    await editCodeMirrorEditor(page, `${subTab}-script-editor`, content);
  });
};

/**
 * Read the content of a Script sub-tab editor
 * @param page - The page object
 * @param subTab - The Script sub-tab to read
 */
export const readScriptContent = async (page: Page, subTab: ScriptSubTab): Promise<string> => {
  await selectScriptSubTab(page, subTab);
  const editorTestId = `${subTab}-script-editor`;
  return buildLocators(page)
    .codeMirror.byTestId(editorTestId)
    .evaluate((el: any, testId: string) => {
      const cm = el.CodeMirror;
      if (!cm) throw new Error(`CodeMirror instance not found for "${testId}"`);
      return cm.getValue();
    }, editorTestId);
};

/**
 * Add a test script (navigates to Tests tab and replaces editor content)
 * @param page - The page object
 * @param content - The test script content to add
 */
export const addTestScript = async (page: Page, content: string) => {
  await test.step('Add test script', async () => {
    await selectRequestPaneTab(page, 'Tests');
    await editCodeMirrorEditor(page, 'test-script-editor', content);
  });
};

/**
 * Locators for the AI Assist triggers in the request pane and settings tab bars.
 */
export const buildAiAssistLocators = (page: Page) => ({
  trigger: (scriptType: string) => page.getByTestId(`ai-assist-trigger-${scriptType}`),
  requestPaneTabBarTrigger: (scriptType: string) =>
    page.locator('[data-testid="request-pane"] [role="tablist"]').getByTestId(`ai-assist-trigger-${scriptType}`),
  settingsTabBarTrigger: (scriptType: string) =>
    page.getByTestId('settings-tab-bar').getByTestId(`ai-assist-trigger-${scriptType}`)
});
