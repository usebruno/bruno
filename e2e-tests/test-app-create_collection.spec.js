const { test, expect } = require('../playwright');
const { execSync } = require('child_process');



function generateRandomCollectionName() {
  const adjectives = ['quick', 'cool', 'test', 'dummy', 'temp'];
  const nouns = ['collection', 'suite', 'group', 'batch'];
  const randomWord = () => Math.random().toString(36).substring(2, 6);

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adj}-${noun}-${randomWord()}`;
}

test('Create Collection', async ({ page }) => {
  const collection_location = '/Users/vedpr/Documents/bruno_tests';
  const collectionName = generateRandomCollectionName();
  // ------------code from playwright------------ //
  await page.getByRole('img').first().click();
  console.log('clicked on the sidebar menu icon');
  await page.locator('#tippy-2').getByText('Create Collection').click();
  console.log('clicked on the create collection');
  await page.getByLabel('Name').click();
  await page.getByLabel('Name').fill(collectionName);
  console.log('filled the collection name');
  await page.getByLabel('Name').press('Tab');
  console.log('pressed tab');
  await page.getByLabel('Location').fill(await collection_location);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  console.log('clicked on the create button');
  //await page.pause();
  await page.waitForTimeout(1000);
  await expect(page.getByText(collectionName)).toBeVisible();
  console.log('collection verified successfully');
  await page.waitForTimeout(1000);

  // duplicate collection creation to verify the error.
  await page.getByRole('img').first().click();
  console.log('clicked on the sidebar menu icon');
  await page.locator('#tippy-2').getByText('Create Collection').click();
  console.log('clicked on the create collection');
  await page.getByLabel('Name').click();
  await page.getByLabel('Name').fill(collectionName);
  console.log('filled the collection name');
  await page.getByLabel('Name').press('Tab');
  console.log('pressed tab');
  await page.getByLabel('Location').fill(collection_location);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  console.log('clicked on the create button');
  console.log('log message');
  console.error('error message');

  //await page.pause();
  await page.waitForTimeout(500);
  await expect(page.getByText('An error occurred while')).toBeVisible();
  console.log('collection already exists error verified successfully');

  execSync(`rm -rf ${collection_location}/${collectionName}`);
});