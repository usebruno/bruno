import { test, expect } from '../../../playwright';

test.describe('Default Collection Location Feature', () => {
  test('Should hydrate the default location from preferences', async ({ pageWithUserData: page }) => {
    // open preferences
    await page.locator('.preferences-button').click();

    // verify the default location is pre-filled
    const defaultLocationInput = page.locator('.default-collection-location-input');
    await expect(defaultLocationInput).toHaveValue('/tmp/bruno-collections');

    // close the preferences
    await page.locator('[data-test-id="modal-close-button"]').click();

    // wait for 2 seconds
    await page.waitForTimeout(2000);
  });

  test('Should save empty default location', async ({ pageWithUserData: page }) => {
    // open preferences
    await page.locator('.preferences-button').click();

    // clear the default location field
    const defaultLocationInput = page.locator('.default-collection-location-input');
    await defaultLocationInput.clear();

    // save preferences
    await page.getByRole('button', { name: 'Save' }).click();

    // verify success message
    await expect(page.locator('text=Preferences saved successfully').first()).toBeVisible();

    // wait for 2 seconds
    await page.waitForTimeout(2000);
  });

  test('Should save a valid default location', async ({ pageWithUserData: page }) => {
    // open preferences
    await page.locator('.preferences-button').click();

    // set a default location
    const defaultLocationInput = page.locator('.default-collection-location-input');

    // fill the default location input
    await defaultLocationInput.fill('/tmp/bruno-collections');

    // save preferences
    await page.getByRole('button', { name: 'Save' }).click();

    // verify success message
    await expect(page.locator('text=Preferences saved successfully').first()).toBeVisible();

    // wait for 2 seconds
    await page.waitForTimeout(2000);
  });

  test('Should use default location in Create Collection modal', async ({ pageWithUserData: page }) => {
    // test Create Collection modal
    await page.locator('.plus-icon-button').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();

    // verify the default location is pre-filled (if location input is visible)
    const collectionLocationInput = page.getByLabel('Location');
    if (await collectionLocationInput.isVisible()) {
      await expect(collectionLocationInput).toHaveValue('/tmp/bruno-collections');
    }

    // cancel the collection creation
    await page.locator('.bruno-modal').getByRole('button', { name: 'Cancel' }).click();

    // wait for 2 seconds
    await page.waitForTimeout(2000);
  });

  test('Should use default location in Clone Collection modal', async ({ pageWithUserData: page }) => {
    // open the clone collection modal
    const collection = page.locator('.collection-name').first();
    await collection.hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Clone' }).click();

    // verify the default location is pre-filled
    const cloneLocationInput = page.getByLabel('Location');
    if (await cloneLocationInput.isVisible()) {
      await expect(cloneLocationInput).toHaveValue('/tmp/bruno-collections');
    }

    // cancel the clone operation
    await page.locator('.bruno-modal').getByRole('button', { name: 'Cancel' }).click();

    // wait for 2 seconds
    await page.waitForTimeout(2000);
  });
});
