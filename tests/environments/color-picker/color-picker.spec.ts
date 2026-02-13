import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page/actions';

const PRESET_COLORS = [
  '#CE4F3B',
  '#2E8A54',
  '#346AB2',
  '#C77A0F',
  '#B83D7F',
  '#8D44B2'
];

// Convert hex color to RGB format used by CSS
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '';
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgb(${r}, ${g}, ${b})`;
};

test.describe('Color Picker Tests', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should select a preset color for global environment', async ({ pageWithUserData: page }) => {
    // Open the collection from sidebar
    await page.locator('#sidebar-collection-name').filter({ hasText: 'global-env-config-selection' }).click();

    // Open global environment configuration
    await page.getByTestId('environment-selector-trigger').click();
    await page.getByTestId('env-tab-global').click();
    await page.getByText('Configure', { exact: true }).click();

    // Wait for the environments tab to be visible
    const envTab = page.locator('.request-tab').filter({ hasText: 'Global Environments' });
    await expect(envTab).toBeVisible();

    // Click on the color picker icon (brush icon) next to the environment name
    const colorPickerTrigger = page.locator('[title="Change color"]').first();
    await colorPickerTrigger.click();

    // Wait for the color picker dropdown to appear
    const colorPickerDropdown = page.locator('.tippy-box');
    await expect(colorPickerDropdown).toBeVisible();

    // Select the first preset color (red) using title attribute
    const presetColor = PRESET_COLORS[0];
    const colorOption = colorPickerDropdown.locator(`[title="${presetColor}"]`);
    await colorOption.click();

    // Verify the color badge in the environment list shows the selected color
    const activeEnvItem = page.locator('.environment-item.active');
    const colorBadge = activeEnvItem.locator('.rounded-full').first();
    await expect(colorBadge).toHaveCSS('background-color', hexToRgb(presetColor));
  });

  test('should remove color from environment', async ({ pageWithUserData: page }) => {
    // Open global environment configuration
    await page.getByTestId('environment-selector-trigger').click();
    await page.getByTestId('env-tab-global').click();
    await page.getByText('Configure', { exact: true }).click();

    // Wait for the environments tab to be visible
    const envTab = page.locator('.request-tab').filter({ hasText: 'Global Environments' });
    await expect(envTab).toBeVisible();

    // Click on the color picker icon
    const colorPickerTrigger = page.locator('[title="Change color"]').first();
    await colorPickerTrigger.click();

    // Wait for the color picker dropdown to appear
    const colorPickerDropdown = page.locator('.tippy-box');
    await expect(colorPickerDropdown).toBeVisible();

    // Click the "No color" option (ban icon)
    const noColorOption = colorPickerDropdown.locator('[title="No color"]');
    await noColorOption.click();

    // Verify the color badge becomes transparent (no color)
    const activeEnvItem = page.locator('.environment-item.active');
    const colorBadge = activeEnvItem.locator('.rounded-full').first();
    await expect(colorBadge).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });

  test('should select custom color using slider', async ({ pageWithUserData: page }) => {
    // Open global environment configuration
    await page.getByTestId('environment-selector-trigger').click();
    await page.getByTestId('env-tab-global').click();
    await page.getByText('Configure', { exact: true }).click();

    // Wait for the environments tab to be visible
    const envTab = page.locator('.request-tab').filter({ hasText: 'Global Environments' });
    await expect(envTab).toBeVisible();

    // Click on the color picker icon
    const colorPickerTrigger = page.locator('[title="Change color"]').first();
    await colorPickerTrigger.click();

    // Wait for the color picker dropdown to appear
    const colorPickerDropdown = page.locator('.tippy-box');
    await expect(colorPickerDropdown).toBeVisible();

    // Find the slider and change its value
    const slider = colorPickerDropdown.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    // Move slider to middle position (50%)
    await slider.fill('50');

    // Click the custom color preview to apply it
    const customColorPreview = colorPickerDropdown.locator('[title="Custom color"]');
    await customColorPreview.click();

    // Verify the color badge has a color applied (not transparent)
    const activeEnvItem = page.locator('.environment-item.active');
    const colorBadge = activeEnvItem.locator('.rounded-full').first();
    const bgColor = await colorBadge.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });

  test('should display color badge in environment list after selecting color', async ({ pageWithUserData: page }) => {
    // Open global environment configuration
    await page.getByTestId('environment-selector-trigger').click();
    await page.getByTestId('env-tab-global').click();
    await page.getByText('Configure', { exact: true }).click();

    // Wait for the environments tab to be visible
    const envTab = page.locator('.request-tab').filter({ hasText: 'Global Environments' });
    await expect(envTab).toBeVisible();

    // Get the currently selected environment name
    const activeEnvItem = page.locator('.environment-item.active');
    const envName = await activeEnvItem.locator('.environment-name').textContent();

    // Click on the color picker icon
    const colorPickerTrigger = page.locator('[title="Change color"]').first();
    await colorPickerTrigger.click();

    // Wait for the color picker dropdown to appear and select a color
    const colorPickerDropdown = page.locator('.tippy-box');
    await expect(colorPickerDropdown).toBeVisible();

    const presetColor = PRESET_COLORS[1]; // green
    const colorOption = colorPickerDropdown.locator(`[title="${presetColor}"]`);
    await colorOption.click();

    // Verify the color badge in the environment list shows the selected color
    const envListItem = page.locator('.environment-item').filter({ hasText: envName as string });
    const colorBadge = envListItem.locator('.rounded-full').first();
    await expect(colorBadge).toHaveCSS('background-color', hexToRgb(presetColor));
  });
});
