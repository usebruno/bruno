import { test, expect } from '../playwright';

test('test-app-start', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'bruno' })).toBeVisible();
});