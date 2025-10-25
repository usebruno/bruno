import { test, expect } from '../../playwright';

test.describe('Edit Response Examples', () => {
  test('should enter edit mode when edit button is clicked', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('make a successful request, and create an example', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click();
      await page.getByTestId('create-example-name-input').fill('Test Example');
      await page.getByTestId('create-example-description-input').fill('This is a test example');
      await page.getByRole('button', { name: 'Create Example' }).click();
    });

    await test.step('Open existing example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click();
    });

    await test.step('Test edit mode', async () => {
      await expect(page.getByTestId('response-example-title')).toBeVisible();
      await expect(page.getByTestId('response-example-edit-btn')).toBeVisible();
      await page.getByTestId('response-example-edit-btn').click();
      await expect(page.getByTestId('response-example-name-input')).toBeVisible();
      await expect(page.getByTestId('response-example-description-input')).toBeVisible();
      await expect(page.getByTestId('response-example-save-btn')).toBeVisible();
      await expect(page.getByTestId('response-example-cancel-btn')).toBeVisible();
    });
  });

  test('should allow editing example name', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Open existing example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click();
    });

    await test.step('Edit example name', async () => {
      await page.getByTestId('response-example-edit-btn').click();
      await page.getByTestId('response-example-name-input').clear();
      await page.getByTestId('response-example-name-input').fill('Updated Example Name');
      await page.getByTestId('response-example-save-btn').click();
      await expect(page.getByTestId('response-example-title')).toHaveText('Updated Example Name');
    });
  });

  test('should allow editing example description', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Open existing example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Updated Example Name', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click();
    });

    await test.step('Edit example description', async () => {
      await page.getByTestId('response-example-edit-btn').click();
      await page.getByTestId('response-example-description-input').clear();
      await page.getByTestId('response-example-description-input').fill('Updated description for the example');
      await page.getByTestId('response-example-save-btn').click();
      await expect(page.getByTestId('response-example-description')).toHaveText('Updated description for the example');
    });
  });

  test('should cancel editing and revert changes', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Open existing example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Updated Example Name', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click();
    });

    await test.step('Test cancel editing', async () => {
      const originalName = await page.getByTestId('response-example-title').textContent();
      await page.getByTestId('response-example-edit-btn').click();
      await page.getByTestId('response-example-name-input').clear();
      await page.getByTestId('response-example-name-input').fill('This should not be saved');
      await page.getByTestId('response-example-cancel-btn').click();
      await expect(page.getByTestId('response-example-title')).toHaveText(originalName!);
    });
  });

  test('should support keyboard shortcuts for saving', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Open existing example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Updated Example Name');
      await expect(exampleItem).toBeVisible();
      await exampleItem.click();
    });

    await test.step('Test keyboard shortcut', async () => {
      await page.getByTestId('response-example-edit-btn').click();
      await page.getByTestId('response-example-name-input').clear();
      await page.getByTestId('response-example-name-input').fill('Keyboard Shortcut Test');
      await page.keyboard.press('Meta+s');
      await expect(page.getByTestId('response-example-title')).toHaveText('Keyboard Shortcut Test');
    });
  });
});
