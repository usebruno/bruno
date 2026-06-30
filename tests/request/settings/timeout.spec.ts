import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { expect, Page, test } from '../../../playwright';
import { closeAllCollections, selectRequestPaneTab } from '../../utils/page';

const bruRequestPath = path.join(__dirname, 'collection', 'requests-settings-bru', 'timeout.bru');
const yamlRequestPath = path.join(__dirname, 'collection', 'requests-settings-yml', 'timeout.yml');

const setGlobalRequestTimeout = async (page: Page, value: string) => {
  await page.locator('.status-bar button[data-trigger="preferences"]').click();

  const generalTab = page.getByRole('tab', { name: 'General' });
  await expect(generalTab).toBeVisible({ timeout: 10000 });
  await generalTab.click();

  const timeoutPreference = page.locator('input[name="timeout"]');
  await expect(timeoutPreference).toBeVisible({ timeout: 10000 });
  await timeoutPreference.fill(value);
  await expect(timeoutPreference).toHaveValue(value, { timeout: 5000 });

  const preferencesTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
  await preferencesTab.hover();
  await preferencesTab.locator('.close-icon').click({ force: true });
  await expect(preferencesTab).not.toBeVisible({ timeout: 10000 });
};

test.describe('Timeout Settings Tests', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test.afterAll(() => {
    execSync(`git checkout -- "${bruRequestPath}" "${yamlRequestPath}"`);
  });

  test.describe('bru request timeout settings', () => {
    test('should configure and test timeout settings', async ({
      pageWithUserData: page
    }) => {
      await expect(page.locator('#sidebar-collection-name').getByText('settings-test')).toBeVisible();

      await page.locator('#sidebar-collection-name').getByText('settings-test').click();
      await page.getByRole('complementary').getByText('timeout-test').click();

      await selectRequestPaneTab(page, 'Settings');

      const timeoutInput = page.locator('#timeout');
      await expect(timeoutInput).toBeVisible();

      await expect(timeoutInput).toHaveValue('5');

      await page.getByTestId('send-arrow-icon').click();

      const responsePane = page.locator('.response-pane');
      await expect(responsePane).toContainText('timeout of 5ms exceeded');

      await setGlobalRequestTimeout(page, '10');

      await page.getByRole('complementary').getByText('timeout-test').click();
      await selectRequestPaneTab(page, 'Settings');

      const resetButton = page.locator('button[title="Reset to inherit"]');
      await expect(resetButton).toBeVisible();
      await resetButton.click();

      const inheritButton = page.locator('button:has-text("Inherit")');
      await expect(inheritButton).toBeVisible();
      await expect(timeoutInput).not.toBeVisible();

      const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
      await page.keyboard.press(saveShortcut);
      await expect(page.getByText('Request saved successfully')).toBeVisible();

      const savedContent = fs.readFileSync(bruRequestPath, 'utf-8');
      expect(savedContent).toMatch(/timeout:\s*['"]?inherit['"]?/);

      const requestTab = page.locator('.request-tab').filter({ hasText: 'timeout-test' });
      await requestTab.hover();
      await requestTab.getByTestId('request-tab-close-icon').click({ force: true });

      await page.getByRole('complementary').getByText('timeout-test').click();
      await selectRequestPaneTab(page, 'Settings');

      await expect(inheritButton).toBeVisible();
      await expect(timeoutInput).not.toBeVisible();

      await page.getByTestId('send-arrow-icon').click();

      await expect(responsePane).toContainText('timeout of 10ms exceeded', { timeout: 15000 });
    });
  });

  test.describe('yaml request timeout settings', () => {
    test('should configure and test timeout settings for yaml request', async ({
      pageWithUserData: page
    }) => {
      await expect(page.locator('#sidebar-collection-name').getByText('settings-yaml')).toBeVisible();

      await page.locator('#sidebar-collection-name').getByText('settings-yaml').click();
      await page.getByRole('complementary').getByText('timeout-test-yaml').click();

      await selectRequestPaneTab(page, 'Settings');

      const timeoutInput = page.locator('#timeout');
      await expect(timeoutInput).toBeVisible();

      await expect(timeoutInput).toHaveValue('5');

      await page.getByTestId('send-arrow-icon').click();

      const responsePane = page.locator('.response-pane');
      await expect(responsePane).toContainText('timeout of 5ms exceeded');

      await setGlobalRequestTimeout(page, '10');

      await page.getByRole('complementary').getByText('timeout-test-yaml').click();
      await selectRequestPaneTab(page, 'Settings');

      const resetButton = page.locator('button[title="Reset to inherit"]');
      await expect(resetButton).toBeVisible();
      await resetButton.click();

      const inheritButton = page.locator('button:has-text("Inherit")');
      await expect(inheritButton).toBeVisible();
      await expect(timeoutInput).not.toBeVisible();

      const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
      await page.keyboard.press(saveShortcut);
      await expect(page.getByText('Request saved successfully')).toBeVisible();

      const savedContent = fs.readFileSync(yamlRequestPath, 'utf-8');
      expect(savedContent).toMatch(/timeout:\s*['"]?inherit['"]?/);

      const requestTab = page.locator('.request-tab').filter({ hasText: 'timeout-test-yaml' });
      await requestTab.hover();
      await requestTab.getByTestId('request-tab-close-icon').click({ force: true });

      await page.getByRole('complementary').getByText('timeout-test-yaml').click();
      await selectRequestPaneTab(page, 'Settings');

      await expect(inheritButton).toBeVisible();
      await expect(timeoutInput).not.toBeVisible();

      await page.getByTestId('send-arrow-icon').click();

      await expect(responsePane).toContainText('timeout of 10ms exceeded', { timeout: 15000 });
    });
  });
});
