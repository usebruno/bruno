import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { openEnvironmentSelector } from '../../utils/page/environments';

const COLLECTION_NAME = 'Env Color Collection';
const ENVIRONMENT_NAME = 'Local';
const COLOR_RGB = 'rgb(206, 79, 59)';

test.describe('[file-cache on] Environment colors', () => {
  test('survive a mount served from the file cache', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.collection(COLLECTION_NAME).click();
    await openEnvironmentSelector(page);
    const colorBadge = locators.environment.listOptionBadge(ENVIRONMENT_NAME).first();
    await expect(colorBadge).toHaveCSS('background-color', COLOR_RGB);
  });
});
