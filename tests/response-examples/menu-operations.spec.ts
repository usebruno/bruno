import { test, expect } from '../../playwright';

test.describe('Response Example Menu Operations', () => {
  test('should clone a response example via three dots menu', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Create and clone example', async () => {
      await page.locator('#send-request').getByRole('img').nth(2).click();
      await page.getByTestId('response-bookmark-btn').click();
      await page.getByTestId('create-example-name-input').fill('Example to Clone');
      await page.getByRole('button', { name: 'Create Example' }).click();

      const exampleItem = page.locator('.collection-item-name').getByText('Example to Clone');
      await expect(exampleItem).toBeVisible();
      await exampleItem.hover();
      await page.getByTestId('response-example-menu-icon').last().click();

      await page.getByTestId('response-example-clone-option').click();
      const clonedExampleItem = page.locator('.collection-item-name').getByText('Example to Clone (Copy)');
      await expect(clonedExampleItem).toBeVisible();
    });
  });

  test('should delete a response example via three dots menu', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Delete example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Example to Clone (Copy)');
      await expect(exampleItem).toBeVisible();
      await exampleItem.hover();
      await page.getByTestId('response-example-menu-icon').last().click();

      await page.getByTestId('response-example-delete-option').click();
      await expect(page.getByText('Delete Example')).toBeVisible();
      await page.getByRole('button', { name: 'Delete' }).click();
      await expect(exampleItem).not.toBeVisible();
    });
  });

  test('should rename a response example via three dots menu', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Rename example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Example to Clone');
      await expect(exampleItem).toBeVisible();
      await exampleItem.hover();
      await page.getByTestId('response-example-menu-icon').last().click();
      await page.getByTestId('response-example-rename-option').click();
      await expect(page.getByText('Rename Example')).toBeVisible();
      const renameExampleNameInput = page.getByTestId('rename-example-name-input');
      await renameExampleNameInput.clear();
      await renameExampleNameInput.fill('Example to Rename');
      await page.getByRole('button', { name: 'Rename' }).click();
      const updatedExampleItem = page.locator('.collection-item-name').getByText('Example to Rename');
      await expect(exampleItem).not.toBeVisible();
      await expect(updatedExampleItem).toBeVisible();
      await expect(updatedExampleItem).toHaveText('Example to Rename');
    });
  });
});
