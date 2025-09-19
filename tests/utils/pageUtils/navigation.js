// returns to home page
export async function returnToHomePage(page) {
  await page.locator('.bruno-logo').click();
}

// navigates to a specific collection by clicking on it
export async function navigateToCollection(page, collectionName) {
  await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
}

// navigates to a specific request within a collection
export async function navigateToRequest(page, collectionId, requestIndex = 0) {
  await page.locator(`#collection-${collectionId} .collection-item-name`).nth(requestIndex).click();
}

// navigates to the first request in a collection
export async function navigateToFirstRequest(page, collectionId) {
  await page.locator(`#collection-${collectionId} .collection-item-name`).first().click();
}

// navigates to a specific request by name
export async function navigateToRequestByName(page, collectionId, requestName) {
  await page.locator(`#collection-${collectionId} .collection-item-name`).filter({ hasText: requestName }).click();
}

// opens the collection actions menu
export async function openCollectionActions(page, collectionName) {
  await page
    .locator('.collection-name')
    .filter({ has: page.locator(`#sidebar-collection-name:has-text("${collectionName}")`) })
    .locator('.collection-actions')
    .click();
}

// navigates to collection settings
export async function navigateToCollectionSettings(page, collectionName) {
  await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
}
