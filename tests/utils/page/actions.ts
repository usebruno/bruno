const closeAllCollections = async (page) => {
  const numberOfCollections = await page.locator('.collection-name').count();

  for (let i = 0; i < numberOfCollections; i++) {
    await page.locator('.collection-name').first().locator('.collection-actions').click();
    await page.locator('.dropdown-item').getByText('Close').click();
    await page.getByRole('button', { name: 'Close' }).click();
  }
};

export { closeAllCollections };
