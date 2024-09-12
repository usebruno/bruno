const { test, expect } = require('@playwright/test');
const { HomePage } = require('../tests/pages/home.page');
const { faker } = require('./utils/data-faker');

test.describe('bruno e2e test', () => {
  let homePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);

    await homePage.open();
    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle(/bruno/);
  });

  test('user should be able to create new collection & new request', async () => {
    await homePage.createNewCollection(faker.randomWords);
    await expect(homePage.createNewCollectionSuccessToast).toBeVisible();

    // using fake data to simulate negative case
    await homePage.createNewRequest(faker.randomVerb, faker.randomHttpMethod, faker.randomUrl);
    await expect(homePage.networkErrorToast).toBeVisible();

    // using real data to simulate positive case
    await homePage.createNewRequest('Single User', 'GET', 'https://reqres.in/api/users/2');
    await expect(homePage.statusRequestSuccess).toBeVisible();
  });

  test('user should be able to load & use sample collection', async () => {
    await homePage.loadSampleCollection();
    await expect(homePage.loadSampleCollectionSuccessToast).toBeVisible();

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
});
