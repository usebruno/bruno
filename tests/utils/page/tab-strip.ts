import { Page, test } from '../../../playwright';
import { buildCommonLocators } from './locators';

export const activeTabIsInStrip = async (page: Page) => {
  const locators = buildCommonLocators(page);
  const strip = await locators.tabs.scrollContainer().boundingBox();
  const tab = await locators.tabs.activeRequestTab().boundingBox();
  if (!strip || !tab) return false;

  return tab.x >= strip.x - 1 && tab.x + tab.width <= strip.x + strip.width + 1;
};

/**
 * Open the active request tab's right-click menu. The tab's close gradient overlays the centre,
 * so the click targets the left edge of the label.
 */
export const openActiveRequestTabMenu = async (page: Page) => {
  await test.step('Open the active request tab menu', async () => {
    const { tabs } = buildCommonLocators(page);
    await tabs.activeRequestTabLabel().click({ button: 'right', position: { x: 4, y: 8 } });
  });
};
