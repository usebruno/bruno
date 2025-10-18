import { test, expect } from '../../playwright';

test('Check if the logo on top left is visible', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'bruno' })).toBeVisible();
});
