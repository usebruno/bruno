import { test, expect } from '../../../playwright';

test.describe('Default Collection Location Feature', () => {
  test('Should hydrate the default location from preferences', async ({ pageWithUserData: page }) => {
    // open preferences tab
    await page.locator('.preferences-button').click();

    // wait for preferences tab to be visible
    await page.waitForTimeout(500);

    // navigate to General tab
    await page.getByRole('tab', { name: 'General' }).click();

    // verify the default location is pre-filled
    const defaultLocationInput = page.locator('.default-collection-location-input');
    await expect(defaultLocationInput).toHaveValue('/tmp/bruno-collections');
  });

  test('Should save a valid default location', async ({ pageWithUserData: page }) => {
    // open preferences tab
    await page.locator('.preferences-button').click();

    // wait for preferences tab to be visible
    await page.waitForTimeout(500);

    // navigate to General tab
    await page.getByRole('tab', { name: 'General' }).click();

    // set a default location (readonly input, remove readonly then fill)
    const defaultLocationInput = page.locator('.default-collection-location-input');
    await defaultLocationInput.evaluate((el) => {
      const input = el;
      input.removeAttribute('readonly');
      input.readOnly = false;
    });
    await defaultLocationInput.fill('/tmp/bruno-collections');

    // wait for auto-save to complete (debounce is 500ms)
    await page.waitForTimeout(1000);
  });

  test('Should use default location in Create Collection modal', async ({ pageWithUserData: page }) => {
    // test Create Collection modal
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();

    // Wait for modal to be visible
    await page.locator('.bruno-modal').waitFor({ state: 'visible' });

    // verify the default location is pre-filled
    // Scope to the modal to avoid conflict with preferences tab
    const collectionLocationInput = page.locator('.bruno-modal').getByLabel('Location', { exact: true });
    await expect(collectionLocationInput).toBeVisible();

    const inputValue = await collectionLocationInput.inputValue();

    await expect(collectionLocationInput).toHaveValue('/tmp/bruno-collections', { timeout: 5000 });

    // cancel the collection creation
    await page.locator('.bruno-modal').getByRole('button', { name: 'Cancel' }).click();
  });

  test('Should use default location in Clone Collection modal', async ({ pageWithUserData: page }) => {
    // open the clone collection modal
    const collection = page.locator('.collection-name').first();
    await collection.hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Clone' }).click();

    // Wait for modal to be visible
    await page.locator('.bruno-modal').waitFor({ state: 'visible' });

    // verify the default location is pre-filled
    // Scope to the modal to avoid conflict with preferences tab
    const cloneLocationInput = page.locator('.bruno-modal').getByLabel('Location', { exact: true });
    await expect(cloneLocationInput).toBeVisible();
    await expect(cloneLocationInput).toHaveValue('/tmp/bruno-collections', { timeout: 5000 });

    // cancel the clone operation
    await page.locator('.bruno-modal').getByRole('button', { name: 'Cancel' }).click();
  });

  test('Should save empty default location', async ({ pageWithUserData: page }) => {
    // open preferences tab
    await page.locator('.preferences-button').click();

    // wait for preferences tab to be visible
    await page.waitForTimeout(500);

    // navigate to General tab
    await page.getByRole('tab', { name: 'General' }).click();

    // clear the default location field (readonly input, remove readonly then clear)
    const defaultLocationInput = page.locator('.default-collection-location-input');
    await defaultLocationInput.evaluate((el) => {
      const input = el;
      input.removeAttribute('readonly');
      input.readOnly = false;
    });
    await defaultLocationInput.clear();

    // wait for auto-save to complete (debounce is 500ms)
    await page.waitForTimeout(1000);
  });
});
