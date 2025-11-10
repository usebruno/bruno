import { test, expect } from '../../playwright';
import { execSync } from 'child_process';
import path from 'path';

test.describe.serial('Response Example Menu Operations', () => {
  test.setTimeout(1 * 60 * 1000); // 1 minute for all tests in this describe block, default is 30 seconds.
  test.afterAll(async () => {
    // Reset the collection request file to the original state
    execSync(`git checkout -- ${path.join(__dirname, 'fixtures', 'collection', 'menu-operations.bru')}`);
  });

  test('should clone a response example via three dots menu', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('menu-operations').click();
    });

    await test.step('Create example', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click();
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Example to Clone');
      await page.getByRole('button', { name: 'Create Example' }).click();
      // Wait for modal to close
      await page.waitForSelector('text=Save Response as Example', { state: 'detached' });
      await page.locator('.collection-item-name', { hasText: 'menu-operations' }).getByTestId('request-item-chevron').click();

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
      await page.locator('.collection-item-name').getByText('menu-operations').click();
    });

    await test.step('Create example to delete', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Example to Delete');
      await page.getByTestId('create-example-description-input').fill('This example will be deleted');
      await page.getByRole('button', { name: 'Create Example' }).click();
      // Wait for modal to close
      await page.waitForSelector('text=Save Response as Example', { state: 'detached' });

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
      await page.locator('.collection-item-name').getByText('menu-operations').click();
    });

    await test.step('Create example to rename', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Example to Rename');
      await page.getByTestId('create-example-description-input').fill('This example will be renamed');
      await page.getByRole('button', { name: 'Create Example' }).click();
      // Wait for modal to close
      await page.waitForSelector('text=Save Response as Example', { state: 'detached' });

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
      // Wait for modal to close
      await page.waitForSelector('text=Rename Example', { state: 'detached' });
      const updatedExampleItem = page.locator('.collection-item-name').getByText('Renamed Example', { exact: true });
      await expect(exampleItem).not.toBeVisible();
      await expect(updatedExampleItem).toBeVisible();
      await expect(updatedExampleItem).toHaveText('Renamed Example');
    });
  });
});
