const { test, expect } = require('@playwright/test');
const { HomePage } = require('../tests/pages/home.page');

test.describe('bruno e2e test', () => {
  let homePage;

  test.beforeEach(async ({ page }) => {  
    homePage = new HomePage(page);

    await homePage.open();
    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle(/bruno/);
  });

  test('user should be able to load & use sample collection', async () => {
    await homePage.loadSampleCollection();
    await expect(homePage.loadSampleCollectionToastSuccess).toBeVisible();

    await homePage.getUsers();
    await expect(homePage.statusRequestSuccess).toBeVisible();

    await homePage.getSingleUser();
    await expect(homePage.statusRequestSuccess).toBeVisible();

    await homePage.getUserNotFound();
    await expect(homePage.statusRequestNotFound).toBeVisible();

    await homePage.createUser();
    await expect(homePage.statusRequestCreated).toBeVisible();

    await homePage.updateUser();
    await expect(homePage.statusRequestSuccess).toBeVisible();
  });

  test('user should be able to create new collection', async () => {
    await homePage.createCollection('test');
    await expect(homePage.createCollectionToastSuccess).toBeVisible();
  })

});
