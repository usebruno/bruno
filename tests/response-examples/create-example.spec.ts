import { test, expect } from '../../playwright';

test.describe('Create Response Examples', () => {

  test('should create a response example from response bookmark', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Send request and validate example creation', async () => {
      await page.getByTestId('send-arrow-icon').click();
      // Wait for 30 seconds for the response bookmark button to be visible, on slower internet connections it may take longer to get the response.
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });

      await expect(page.getByText('Save Response as Example')).toBeVisible();
      await expect(page.getByTestId('create-example-name-input')).toBeVisible();
      await expect(page.getByTestId('create-example-description-input')).toBeVisible();

      await page.getByTestId('create-example-name-input').fill('Test Example from Bookmark');
      await page.getByTestId('create-example-description-input').fill('This is a test example created from response bookmark');
      await page.getByRole('button', { name: 'Create Example' }).click();
      await expect(page.getByText('Test Example from Bookmark')).toBeVisible();
    });
  });

  test('Validate name is required to create example', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Validate error when name is empty', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });

      await expect(page.getByRole('button', { name: 'Create Example' })).toBeEnabled();

      await page.getByRole('button', { name: 'Create Example' }).click();
      await expect(page.getByTestId('name-error')).toBeVisible();
      await expect(page.getByTestId('name-error')).toHaveText('Example name is required');
    });

    await test.step('Create example with valid name', async () => {
      await page.getByTestId('create-example-name-input').fill('Required Name');
      await page.getByRole('button', { name: 'Create Example' }).click();

      // Modal should close and example should be created
      await expect(page.getByText('Save Response as Example')).not.toBeVisible();
    });
  });

  test('should close modal when cancelled', async ({ pageWithUserData: page }) => {
    await test.step('Test modal cancellation', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('Save Response as Example')).not.toBeVisible();
    });
  });

  test('should reset form when modal is reopened', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Test form reset', async () => {
      await page.locator('#send-request').getByRole('img').nth(2).click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });

      await page.getByTestId('create-example-name-input').fill('Test Name');
      await page.getByTestId('create-example-description-input').fill('Test Description');
      await page.getByRole('button', { name: 'Cancel' }).click();

      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });
      await expect(page.getByTestId('create-example-name-input')).toHaveValue('');
      await expect(page.getByTestId('create-example-description-input')).toHaveValue('');
      await page.getByRole('button', { name: 'Cancel' }).click();
    });
  });

  test('should show created example in sidebar after expanding request', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').getByText('echo-request').click();
    });

    await test.step('Create example and verify sidebar visibility', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-bookmark-btn').click({ timeout: 30000 });

      await page.getByTestId('create-example-name-input').fill('Sidebar Test Example');
      await page.getByTestId('create-example-description-input').fill('This example should appear in the sidebar');
      await page.getByRole('button', { name: 'Create Example' }).click();
    });

    await test.step('Verify example appears in sidebar', async () => {
      await page.getByTestId('request-item-chevron').click();
      const exampleItem = page.locator('.collection-item-name').getByText('Sidebar Test Example', { exact: true });
      await expect(exampleItem).toBeVisible();

      await exampleItem.click();
    });
  });

  test('Cleanup: Delete all created examples', async ({ pageWithUserData: page }) => {
    await test.step('Delete Test Example from Bookmark', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Test Example from Bookmark', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click({ button: 'right' });
      await page.getByText('Delete').click();
      const deleteButton = page.getByRole('button', { name: 'Delete' });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      await expect(exampleItem).not.toBeVisible();
    });

    await test.step('Delete Required Name example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Required Name', { exact: true });
      await expect(exampleItem).toBeVisible();
      await exampleItem.click({ button: 'right' });
      await page.getByText('Delete').click();
      const deleteButton = page.getByRole('button', { name: 'Delete' });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click({ timeout: 30000 });
      await expect(exampleItem).not.toBeVisible();
    });

    await test.step('Delete Sidebar Test Example', async () => {
      const exampleItem = page.locator('.collection-item-name').getByText('Sidebar Test Example', { exact: true });
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
