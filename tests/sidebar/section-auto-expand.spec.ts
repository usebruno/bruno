import { test, expect } from '../../playwright';

test.describe('Sidebar Section Auto-Expand', () => {
  test('Clicking action button on collapsed section should expand it', async ({ page }) => {
    // The api-specs section is collapsed by default (only collections is expanded)
    // Find the api-specs section by its title
    const apiSpecsSection = page.locator('.sidebar-section').filter({ hasText: 'API Specs' });

    // Verify the api-specs section is initially collapsed (doesn't have 'expanded' class)
    await expect(apiSpecsSection).not.toHaveClass(/expanded/);

    // Verify section-content is not visible when collapsed
    const sectionContent = apiSpecsSection.locator('.section-content');
    await expect(sectionContent).not.toBeVisible();

    // Click on the add button in the section-actions area
    // This should trigger the auto-expand logic
    const addButton = page.getByTestId('api-specs-header-add-menu');
    await addButton.click();

    // Close the dropdown by pressing Escape (we just want to test the expand, not the dropdown action)
    await page.keyboard.press('Escape');

    // After clicking an action, the section should be expanded
    await expect(apiSpecsSection).toHaveClass(/expanded/);

    // Verify section-content is now visible
    await expect(sectionContent).toBeVisible();
  });

  test('Clicking action button on already expanded section should keep it expanded', async ({ page }) => {
    // The collections section is expanded by default
    const collectionsSection = page.locator('.sidebar-section').filter({ hasText: 'Collections' });

    // Verify the collections section is initially expanded
    await expect(collectionsSection).toHaveClass(/expanded/);

    // Verify section-content is visible
    const sectionContent = collectionsSection.locator('.section-content');
    await expect(sectionContent).toBeVisible();

    // Click on the add button in the section-actions area
    const addButton = page.getByTestId('collections-header-add-menu');
    await addButton.click();

    // Close the dropdown
    await page.keyboard.press('Escape');

    // Section should still be expanded
    await expect(collectionsSection).toHaveClass(/expanded/);
    await expect(sectionContent).toBeVisible();
  });

  test('Clicking search action on collapsed collections section should expand it', async ({ page }) => {
    // First, collapse the collections section by clicking on its header
    const collectionsSection = page.locator('.sidebar-section').filter({ hasText: 'Collections' });
    const sectionHeader = collectionsSection.locator('.section-header-left');
    await sectionHeader.click();

    // Verify the section is now collapsed
    await expect(collectionsSection).not.toHaveClass(/expanded/);
    const sectionContent = collectionsSection.locator('.section-content');
    await expect(sectionContent).not.toBeVisible();

    // Now click on the search action button in the collapsed section
    // The search button is in section-actions with title "Search requests"
    const searchButton = collectionsSection.locator('.section-actions button[title="Search requests"]');
    await searchButton.click();

    // The section should now be expanded
    await expect(collectionsSection).toHaveClass(/expanded/);
    await expect(sectionContent).toBeVisible();
  });
});
