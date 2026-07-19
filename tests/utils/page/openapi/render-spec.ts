import { test, Page, ElectronApplication } from '../../../../playwright';

export const buildApiSpecPanelLocators = (page: Page) => ({
  addMenuButton: () => page.getByTestId('api-specs-header-add-menu'),
  openApiSpecMenuItem: () => page.getByTestId('api-specs-header-add-menu-open-api-spec'),
  sidebarItem: (name: string) => page.locator('.api-spec-item').filter({ hasText: name })
});

export const openApiSpecFromDialog = async (
  page: Page,
  electronApp: ElectronApplication,
  filePath: string
): Promise<void> => {
  await test.step(`Open API spec from path: ${filePath}`, async () => {
    await electronApp.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] });
    }, filePath);

    const { addMenuButton, openApiSpecMenuItem } = buildApiSpecPanelLocators(page);
    await addMenuButton().click();
    await openApiSpecMenuItem().click();
  });
};

export const openApiSpecSidebarItem = async (page: Page, name: string): Promise<void> => {
  await test.step(`Open API spec sidebar item "${name}"`, async () => {
    const { sidebarItem } = buildApiSpecPanelLocators(page);
    await sidebarItem(name).click();
  });
};
