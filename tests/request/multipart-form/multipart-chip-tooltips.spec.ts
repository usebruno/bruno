import { test, expect } from '../../../playwright';
import type { Locator } from '@playwright/test';
import { closeAllCollections } from '../../utils/page';

test.describe('Multipart Form - Chip Tooltip Swap', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('tooltip swaps between file path and "Remove file"', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').getByText('collection').click();
    await page.locator('.collection-item-name').filter({ hasText: 'chip-tooltip' }).click();

    const tooltip = page.locator('[role="tooltip"], .react-tooltip').filter({ visible: true });

    const inlineChip = page.getByTestId('multipart-file-chip').first();
    const summary = page.getByTestId('multipart-file-summary');
    await expect(inlineChip.or(summary).first()).toBeVisible({ timeout: 15000 });

    let nameTarget: Locator, removeBtn: Locator;
    if (await summary.count()) {
      await summary.click();
      const row = page.getByTestId('multipart-file-overflow-row').first();
      await expect(row).toBeVisible();
      nameTarget = row.locator('.overflow-row-name');
      removeBtn = row.getByTestId('multipart-file-overflow-remove');
    } else {
      nameTarget = inlineChip.locator('.file-chip-name');
      removeBtn = inlineChip.getByTestId('multipart-file-chip-remove');
    }

    await test.step('Hover chip body → file path', async () => {
      await nameTarget.hover();
      await expect(tooltip.first()).toBeVisible({ timeout: 15000 });
      await expect(tooltip.first()).toContainText('alpha.txt');
    });

    await test.step('Hover X → "Remove file"', async () => {
      await removeBtn.hover();
      await expect(tooltip.first()).toHaveText('Remove file');
    });

    await test.step('Hover back to chip body → path again', async () => {
      await nameTarget.hover();
      await expect(tooltip.first()).not.toHaveText('Remove file');
      await expect(tooltip.first()).toContainText('alpha.txt');
    });

    await test.step('Only one tooltip visible at a time', async () => {
      await removeBtn.hover();
      await expect(tooltip).toHaveCount(1);
    });
  });
});
