import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs } from './actions';

test.describe('Rich Text Editor Edge Cases - Heading Levels', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Text size dropdown applies Heading 1 through 6 and Normal removes the heading', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-headings');
    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Heading text');

    for (let level = 1; level <= 6; level++) {
      await locators.docs.headingDropdown().click();
      await locators.dropdown.item(`Heading ${level}`).click();
      await expect(prosemirror.locator(`h${level}`)).toContainText('Heading text');
      await expect(prosemirror.locator('h1, h2, h3, h4, h5, h6')).toHaveCount(1);
    }

    await locators.docs.headingDropdown().click();
    await locators.dropdown.item('Normal').click();
    await expect(prosemirror.locator('h1, h2, h3, h4, h5, h6')).toHaveCount(0);
    await expect(prosemirror.locator('p').filter({ hasText: 'Heading text' })).toBeVisible();
  });
});
