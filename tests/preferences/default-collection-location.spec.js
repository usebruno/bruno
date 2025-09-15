import { test, expect } from '../../playwright';

test.describe('Default Collection Location Feature', () => {
  test('Should save empty default location', async ({ page }) => {
    // open preferences
    await page.locator('.preferences-button').click();

    // clear the default location field
    const defaultLocationInput = page.locator('.default-collection-location-input');
    await defaultLocationInput.clear();

    // save preferences
    await page.getByRole('button', { name: 'Save' }).click();

    // verify success message
    await expect(page.locator('text=Preferences saved successfully')).toBeVisible();
  });

  test('Should save a valid default location', async ({ page }) => {
    // open preferences
    await page.locator('.preferences-button').click();

    // set a default location
    const defaultLocationInput = page.locator('.default-collection-location-input');

    // fill the default location input
    await defaultLocationInput.fill('/tmp/bruno-collections');

    // save preferences
    await page.getByRole('button', { name: 'Save' }).click();

    // verify success message
    await expect(page.locator('text=Preferences saved successfully')).toBeVisible();
  });

  test('Should erase default location and save', async ({ page }) => {
    // open preferences
    await page.getByLabel('Open Preferences').click();
    await page.getByRole('tab', { name: 'General' }).click();

    const defaultLocationInput = page.locator('.default-collection-location-input');
    await defaultLocationInput.fill('/tmp/some-location');
    await page.getByRole('button', { name: 'Save' }).click();

    // erase the default location
    await page.getByLabel('Open Preferences').click();
    await page.getByRole('tab', { name: 'General' }).click();

    await defaultLocationInput.clear();
    await page.getByRole('button', { name: 'Save' }).click();

    // verify success message
    await expect(page.locator('text=Preferences saved successfully')).toBeVisible();

    // open preferences
    await page.locator('.preferences-button').click();

    // verify field is empty
    await expect(defaultLocationInput).toHaveValue('');
  });

  test('Should use default location in Create Collection modal', async ({ page }) => {
    // open preferences
    await page.locator('.preferences-button').click();
    await page.getByRole('tab', { name: 'General' }).click();

    const defaultLocationInput = page.locator('.default-collection-location-input');
    await defaultLocationInput.fill('/tmp/bruno-default');
    await page.getByRole('button', { name: 'Save' }).click();

    // test Create Collection modal
    await page.locator('[data-testid="create-collection"]').click();

    // verify the default location is pre-filled
    const collectionLocationInput = page.getByLabel('Location');
    await expect(collectionLocationInput).toHaveValue('/tmp/bruno-default');

    // cancel the collection creation
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('Should use default location in Clone Collection modal', async ({ pageWithUserData: page }) => {
    await page.locator('.preferences-button').click();
    await page.getByRole('tab', { name: 'General' }).click();

    const defaultLocationInput = page.locator('.default-collection-location-input');
    await defaultLocationInput.fill('/tmp/test-collection');
    await page.getByRole('button', { name: 'Save' }).click();

    // open the collection
    await expect(page.getByTitle('collection')).toBeVisible();
    await page.getByTitle('collection').click();

    // open the clone collection modal
    await page.getByText('Clone').click();

    // verify the default location is pre-filled
    const cloneLocationInput = page.getByLabel('Location');
    await expect(cloneLocationInput).toHaveValue('/tmp/test-collection');

    // cancel the clone collection
    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});
