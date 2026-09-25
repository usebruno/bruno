import { test, expect, Page } from '../../../../playwright';
import { buildApiSpecPanelLocators } from './render-spec';

export const buildApiSpecRowMenuLocators = (page: Page) => {
  const { sidebarRow, sidebarRowActions, specTab } = buildApiSpecPanelLocators(page);

  return {
    section: () => page.getByTestId('sidebar-section-api-specs'),
    sectionHeader: () => page.getByTestId('sidebar-section-api-specs-header'),
    row: (name: string) => sidebarRow(name),
    rowActions: (name: string) => sidebarRowActions(name),
    specTab: (filename: string) => specTab(filename),
    menuItems: () => page.locator('.tippy-box [role="menuitem"]'),
    menuItem: (id: string) => page.getByTestId(`api-spec-actions-${id}`),
    menuDivider: () => page.locator('.tippy-box .dropdown-separator'),

    removeModal: () => page.locator('.bruno-modal').filter({ hasText: 'Remove from Workspace' }),
    removeSubmit: () => page.locator('.bruno-modal').filter({ hasText: 'Remove from Workspace' }).getByTestId('modal-submit-btn'),
    renameModal: () => page.getByTestId('rename-api-spec-modal'),
    renameInput: () => page.getByTestId('rename-api-spec-name'),
    renameSubmit: () => page.getByTestId('rename-api-spec-modal-submit-btn'),
    cloneModal: () => page.getByTestId('clone-api-spec-modal'),
    cloneNameInput: () => page.getByTestId('clone-api-spec-name'),
    cloneLocationInput: () => page.getByTestId('clone-api-spec-location'),
    cloneSubmit: () => page.getByTestId('clone-api-spec-modal-submit-btn'),
    deleteModal: () => page.getByTestId('delete-api-spec-modal'),
    deleteSubmit: () => page.getByTestId('delete-api-spec-modal-submit-btn'),
    importLocationModal: () => page.getByTestId('import-collection-location-modal'),
    importLocationName: (name: string) => page.getByTestId('import-collection-location-modal').getByText(name),
    importLocationSubmit: () => page.getByTestId('import-collection-location-modal').getByRole('button', { name: 'Import' })
  };
};

export const expandApiSpecsSection = async (page: Page) => {
  await test.step('Expand the API Specs sidebar section', async () => {
    const menu = buildApiSpecRowMenuLocators(page);
    await menu.section().waitFor({ state: 'visible' });
    if ((await menu.section().getAttribute('data-expanded')) !== 'true') {
      await menu.sectionHeader().click();
    }
    await expect(menu.section()).toHaveAttribute('data-expanded', 'true');
  });
};

export const openApiSpecRowMenu = async (page: Page, name: string) => {
  await test.step(`Open the actions menu of API spec "${name}"`, async () => {
    const menu = buildApiSpecRowMenuLocators(page);
    await menu.row(name).hover();
    await menu.rowActions(name).click();
    await menu.menuItems().first().waitFor({ state: 'visible' });
  });
};

export const chooseApiSpecRowAction = async (page: Page, name: string, actionId: string) => {
  await openApiSpecRowMenu(page, name);
  await test.step(`Choose "${actionId}"`, async () => {
    await buildApiSpecRowMenuLocators(page).menuItem(actionId).click();
  });
};
