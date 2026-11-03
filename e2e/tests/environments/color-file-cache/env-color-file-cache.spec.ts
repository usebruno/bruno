import { test, expect } from '../../../playwright';
import { buildCommonLocators, openEnvironmentDropdown } from '../../../pages';

const COLLECTION_NAME = 'Env Color Collection';
const ENVIRONMENT_NAME = 'Local';
const COLOR_RGB = 'rgb(206, 79, 59)';

test.describe('[file-cache on] Environment colors', () => {
  test('survive a mount served from the file cache', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.collection(COLLECTION_NAME).click();
    await openEnvironmentDropdown(page);
    const colorBadge = locators.environment.listOptionBadge(ENVIRONMENT_NAME).first();
    await expect(colorBadge).toHaveCSS('background-color', COLOR_RGB);
  });
});
