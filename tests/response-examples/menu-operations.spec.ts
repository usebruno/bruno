import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page';

test.describe('Response Example Menu Operations', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should clone a response example via three dots menu', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Create example', async () => {
      await page.locator('#send-request').getByRole('img').nth(2).click();
      await page.getByTestId('response-bookmark-btn').click();
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Example to Clone');
      await page.getByRole('button', { name: 'Create Example' }).click();

      const exampleItem = page.locator('.collection-item-name').getByText('Example to Clone');
      await expect(exampleItem).toBeVisible();
    });

    await test.step('Clone example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Example to Clone');
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

    await test.step('Create example to delete', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Example to Delete');
      await page.getByTestId('create-example-description-input').fill('This example will be deleted');
      await page.getByRole('button', { name: 'Create Example' }).click();

      const exampleItem = page.locator('.collection-item-name').getByText('Example to Delete', { exact: true });
      await expect(exampleItem).toBeVisible();
    });

    await test.step('Delete example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Example to Delete', { exact: true });
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

    await test.step('Create example to rename', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Example to Rename');
      await page.getByTestId('create-example-description-input').fill('This example will be renamed');
      await page.getByRole('button', { name: 'Create Example' }).click();

      const exampleItem = page.locator('.collection-item-name').getByText('Example to Rename', { exact: true });
      await expect(exampleItem).toBeVisible();
    });

    await test.step('Rename example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Example to Rename', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.hover();
      await page.getByTestId('response-example-menu-icon').last().click();
      await page.getByTestId('response-example-rename-option').click();
      await expect(page.getByText('Rename Example')).toBeVisible();
      const renameExampleNameInput = page.getByTestId('rename-example-name-input');
      await renameExampleNameInput.clear();
      await renameExampleNameInput.fill('Renamed Example');
      await page.getByRole('button', { name: 'Rename' }).click();
      const updatedExampleItem = page.locator('.collection-item-name').getByText('Renamed Example', { exact: true });
      await expect(exampleItem).not.toBeVisible();
      await expect(updatedExampleItem).toBeVisible();
      await expect(updatedExampleItem).toHaveText('Renamed Example');
    });
  });

  test('Cleanup: Delete all created examples', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Delete Example to Clone', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Example to Clone', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click({ button: 'right' });
      await page.getByText('Delete').click();
      const deleteButton = page.getByRole('button', { name: 'Delete' });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      await expect(exampleItem).not.toBeVisible();
    });

    await test.step('Delete Example to Clone (Copy)', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Example to Clone (Copy)', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click({ button: 'right' });
      await page.getByText('Delete').click();
      const deleteButton = page.getByRole('button', { name: 'Delete' });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      await expect(exampleItem).not.toBeVisible();
    });

    await test.step('Delete Renamed Example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Renamed Example', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click({ button: 'right' });
      await page.getByText('Delete').click();
      const deleteButton = page.getByRole('button', { name: 'Delete' });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      await expect(exampleItem).not.toBeVisible();
    });
  });
});
