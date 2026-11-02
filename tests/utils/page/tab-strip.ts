import { Page } from '../../../playwright';
import { buildCommonLocators } from './locators';

export const activeTabIsInStrip = async (page: Page) => {
  const locators = buildCommonLocators(page);
  const strip = await locators.tabs.scrollContainer().boundingBox();
  const tab = await locators.tabs.activeRequestTab().boundingBox();
  if (!strip || !tab) return false;

  return tab.x >= strip.x - 1 && tab.x + tab.width <= strip.x + strip.width + 1;
};
