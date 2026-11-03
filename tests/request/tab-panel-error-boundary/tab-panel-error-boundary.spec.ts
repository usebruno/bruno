import { expect, Page, test } from '../../../playwright';
import { openRequest } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

// NOTE: Rewritten instead of `selectRequestPaneTab` from actions.ts because we want to avoid assertion
// of tab active state
const openRequestSettingsTab = async (page: Page) => {
  const requestPane = page.locator('[data-testid="request-pane"] > .px-4');
  await expect(requestPane).toBeVisible();

  const settingsTab = requestPane.locator('.tabs').getByRole('tab', { name: 'Settings' });
  if (await settingsTab.isVisible().catch(() => false)) {
    await settingsTab.click();
    return;
  }

  const moreTabs = requestPane.locator('.tabs .more-tabs');
  await expect(moreTabs).toBeVisible();
  await moreTabs.click();
  await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Settings' }).click({ force: true });
};

const assertTabPanelErrorBoundary = async (page: Page, collectionName: string, requestName: string) => {
  const commonLocators = buildCommonLocators(page);

  await test.step(`Open ${requestName} and trigger render error`, async () => {
    await openRequest(page, collectionName, requestName);
    await expect(commonLocators.tabs.activeRequestTab()).toContainText(requestName);
    await openRequestSettingsTab(page);
  });

  await test.step('Verify fallback UI', async () => {
    await expect(page.getByText('Something went wrong')).toBeVisible();
    await expect(
      page.getByText(
        'This tab encountered an unexpected error. Close it and try reopening the request. If the error repeats, the request file may be corrupt.'
      )
    ).toBeVisible();
    await expect(page.getByTestId('tab-panel-error-boundary-close-tab')).toBeVisible();
  });

  await test.step('Close errored tab via boundary action', async () => {
    await page.getByTestId('tab-panel-error-boundary-close-tab').click();
    await expect(commonLocators.tabs.requestTab(requestName)).not.toBeVisible();
  });
};

const assertBoundaryVisible = async (page: Page) => {
  await expect(page.getByText('Something went wrong')).toBeVisible();
  await expect(page.getByTestId('tab-panel-error-boundary-close-tab')).toBeVisible();
};

test.describe.serial('Tab Panel Error Boundary', () => {
  test('handles invalid tags type in YAML request metadata', async ({ pageWithUserData: page }) => {
    await assertTabPanelErrorBoundary(page, 'invalid-tags-yml', 'invalid-tags-yml-request');
  });

  test('shows error only on failed tab and allows switching to valid tab', async ({ pageWithUserData: page }) => {
    const commonLocators = buildCommonLocators(page);

    await openRequest(page, 'invalid-tags-yml', 'invalid-tags-yml-request', { persist: true });
    await openRequestSettingsTab(page);
    await assertBoundaryVisible(page);

    await openRequest(page, 'invalid-tags-yml', 'control-yml-request');
    await expect(commonLocators.tabs.activeRequestTab()).toContainText('control-yml-request');
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(page.getByTestId('tab-panel-error-boundary-close-tab')).toHaveCount(0);
    await expect(page.locator('[data-testid="request-pane"]')).toBeVisible();

    await commonLocators.tabs.requestTab('invalid-tags-yml-request').click();
    await expect(commonLocators.tabs.activeRequestTab()).toContainText('invalid-tags-yml-request');
    await assertBoundaryVisible(page);
  });
});
