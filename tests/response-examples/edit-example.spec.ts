import { test, expect } from '../../playwright';
test.describe('Edit Response Examples', () => {
  test('should enter edit mode and show editable fields when edit button is clicked', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Make a successful request and create an example', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click();
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Test Example');
      await page.getByTestId('create-example-description-input').fill('This is a test example');
      await page.getByRole('button', { name: 'Create Example' }).click();
    });

    await test.step('Open existing example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click();
    });

    await test.step('Verify edit mode functionality', async () => {
      await expect(page.getByTestId('response-example-title')).toBeVisible();
      await expect(page.getByTestId('response-example-edit-btn')).toBeVisible();
      await page.getByTestId('response-example-edit-btn').click();
      await expect(page.getByTestId('response-example-name-input')).toBeVisible();
      await expect(page.getByTestId('response-example-description-input')).toBeVisible();
      await expect(page.getByTestId('response-example-save-btn')).toBeVisible();
      await expect(page.getByTestId('response-example-cancel-btn')).toBeVisible();
    });
  });

  test('should successfully update example name and persist changes', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Create example to update', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Original Example Name');
      await page.getByTestId('create-example-description-input').fill('Original description');
      await page.getByRole('button', { name: 'Create Example' }).click();

      const exampleItem = page.locator('.collection-item-name').getByText('Original Example Name', { exact: true });
      await expect(exampleItem).toBeVisible();
    });

    await test.step('Open existing example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Original Example Name', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click();
    });

    await test.step('Update example name and verify persistence', async () => {
      await page.getByTestId('response-example-edit-btn').click();
      await page.getByTestId('response-example-name-input').clear();
      await page.getByTestId('response-example-name-input').fill('Updated Example Name');
      await page.getByTestId('response-example-save-btn').click();
      await expect(page.getByTestId('response-example-title')).toHaveText('Updated Example Name');
    });
  });

  test('should successfully update example description and persist changes', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Create example to update description', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Description Test Example');
      await page.getByTestId('create-example-description-input').fill('Original description');
      await page.getByRole('button', { name: 'Create Example' }).click();

      const exampleItem = page.locator('.collection-item-name').getByText('Description Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
    });

    await test.step('Open existing example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Description Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click();
    });

    await test.step('Update example description and verify persistence', async () => {
      await page.getByTestId('response-example-edit-btn').click();
      await page.getByTestId('response-example-description-input').clear();
      await page.getByTestId('response-example-description-input').fill('Updated description for the example');
      await page.getByTestId('response-example-save-btn').click();
      await expect(page.getByTestId('response-example-description')).toHaveText('Updated description for the example');
    });
  });

  test('should discard changes and revert to original values when cancel is clicked', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Create example to test cancel functionality', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Cancel Test Example');
      await page.getByTestId('create-example-description-input').fill('Original description for cancel test');
      await page.getByRole('button', { name: 'Create Example' }).click();

      const exampleItem = page.locator('.collection-item-name').getByText('Cancel Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
    });

    await test.step('Open existing example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Cancel Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click();
    });

    await test.step('Test cancel functionality and verify reversion', async () => {
      const originalName = await page.getByTestId('response-example-title').textContent();
      await page.getByTestId('response-example-edit-btn').click();
      await page.getByTestId('response-example-name-input').clear();
      await page.getByTestId('response-example-name-input').fill('This should not be saved');
      await page.getByTestId('response-example-cancel-btn').click();
      await expect(page.getByTestId('response-example-title')).toHaveText(originalName!);
    });
  });

  test('should save changes using keyboard shortcut (Cmd+S)', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Create example to test keyboard shortcut', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Keyboard Shortcut Test Example');
      await page.getByTestId('create-example-description-input').fill('Original description for keyboard test');
      await page.getByRole('button', { name: 'Create Example' }).click();

      const exampleItem = page.locator('.collection-item-name').getByText('Keyboard Shortcut Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
    });

    await test.step('Open existing example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Keyboard Shortcut Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click();
    });

    await test.step('Test keyboard shortcut save functionality', async () => {
      await page.getByTestId('response-example-edit-btn').click();
      await page.getByTestId('response-example-name-input').clear();
      await page.getByTestId('response-example-name-input').fill('Keyboard Shortcut Test');
      await page.keyboard.press('Meta+s');
      await expect(page.getByTestId('response-example-title')).toHaveText('Keyboard Shortcut Test');
    });
  });

  test('Cleanup: Delete all created examples', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Delete Test Example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click({ button: 'right' });
      await page.getByText('Delete').click();
      const deleteButton = page.getByRole('button', { name: 'Delete' });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      await expect(exampleItem).not.toBeVisible();
    });

    await test.step('Delete Updated Example Name', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Updated Example Name', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click({ button: 'right' });
      await page.getByText('Delete').click();
      const deleteButton = page.getByRole('button', { name: 'Delete' });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      await expect(exampleItem).not.toBeVisible();
    });

    await test.step('Delete Description Test Example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Description Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click({ button: 'right' });
      await page.getByText('Delete').click();
      const deleteButton = page.getByRole('button', { name: 'Delete' });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      await expect(exampleItem).not.toBeVisible();
    });

    await test.step('Delete Cancel Test Example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Cancel Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click({ button: 'right' });
      await page.getByText('Delete').click();
      const deleteButton = page.getByRole('button', { name: 'Delete' });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      await expect(exampleItem).not.toBeVisible();
    });

    await test.step('Delete Keyboard Shortcut Test', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Keyboard Shortcut Test', { exact: true });
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
