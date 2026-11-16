import { Page, test, expect } from '../../../playwright';
import { buildCommonLocators } from './locators';

export const openResponseTimeline = async (page: Page) => {
  await test.step('Open Response → Timeline', async () => {
    const { response, timeline } = buildCommonLocators(page);
    const timelineTab = response.pane().getByRole('tab', { name: 'Timeline' });
    const overflowButton = response.tabsOverflowButton();

    await expect(timelineTab.or(overflowButton).first()).toBeVisible();

    if (await timelineTab.isVisible()) {
      await timelineTab.click();
    } else {
      await overflowButton.click();
      const timelineOverflowItem = response.tabsOverflowItem('Timeline');
      await expect(timelineOverflowItem).toBeVisible();
      await timelineOverflowItem.click();
    }

    await expect(timeline.container()).toBeVisible();
  });
};
