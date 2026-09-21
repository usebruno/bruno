import { test, expect, Page, ElectronApplication } from '../../../../playwright';

export const buildApiSpecPanelLocators = (page: Page) => ({
  addMenuButton: () => page.getByTestId('api-specs-header-add-menu'),
  openApiSpecMenuItem: () => page.getByTestId('api-specs-header-add-menu-open-api-spec'),
  sidebarItems: () => page.locator('.api-spec-item'),
  sidebarItem: (name: string) => page.locator('.api-spec-item').filter({ hasText: name }),
  specEditor: () => page.locator('.api-spec-left-pane .CodeMirror'),
  specTab: (tabLabel: string) => page.locator('.request-tab').filter({ hasText: tabLabel }),
  tabUnsavedMarker: (tabLabel: string) =>
    page.locator('.request-tab').filter({ hasText: tabLabel }).locator('.close-gradient'),
  unsavedChangesDialog: () => page.locator('.bruno-modal').filter({ hasText: 'unsaved changes in the API spec' }),
  saveAndCloseButton: () => page.getByRole('button', { name: 'Save', exact: true }),
  sidebarRow: (name: string | RegExp) => page.getByTestId('sidebar-api-spec-row').filter({ hasText: name }),
  sidebarRowActions: (name: string | RegExp) => page.getByTestId('sidebar-api-spec-row').filter({ hasText: name }).getByTestId('api-spec-actions'),
  sidebarRowRemoveMenuItem: () => page.getByTestId('api-spec-actions-remove')
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

export const typeIntoApiSpecEditor = async (page: Page, text: string): Promise<void> => {
  await test.step(`Type "${text}" at the top of the API spec editor`, async () => {
    const editor = buildApiSpecPanelLocators(page).specEditor();
    await editor.waitFor();
    await editor.evaluate((node: any) => {
      node.CodeMirror.setCursor({ line: 0, ch: 0 });
      node.CodeMirror.focus();
    });
    await page.keyboard.type(text);
  });
};

export const closeOtherTabsFrom = async (page: Page, tabLabel: string): Promise<void> => {
  await test.step(`Close every tab except "${tabLabel}"`, async () => {
    await page
      .locator('.request-tab')
      .filter({ hasText: tabLabel })
      .locator('.tab-label')
      .click({ button: 'right', position: { x: 5, y: 5 } });

    const dropdown = page.locator('.tippy-box.dropdown');
    await dropdown.waitFor({ state: 'visible' });
    await dropdown.locator('[role="menuitem"][data-item-id="close-others"]').click();
  });
};

export const pressSaveShortcut = async (page: Page): Promise<void> => {
  await test.step('Press the save shortcut', async () => {
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s');
  });
};

export const closeApiSpecTab = async (page: Page, tabLabel: string): Promise<void> => {
  await test.step(`Close the "${tabLabel}" tab`, async () => {
    const { specTab } = buildApiSpecPanelLocators(page);
    const tab = specTab(tabLabel);
    await tab.hover();
    await tab.getByTestId('request-tab-close-icon').click();
  });
};

export const removeApiSpecFromWorkspace = async (page: Page, name: string): Promise<void> => {
  await test.step(`Remove API spec "${name}" from the workspace`, async () => {
    const { sidebarRow, sidebarRowActions, sidebarRowRemoveMenuItem } = buildApiSpecPanelLocators(page);
    await sidebarRow(name).first().hover();
    await sidebarRowActions(name).first().click();
    await sidebarRowRemoveMenuItem().click();
    await page.getByTestId('modal-submit-btn').click();
  });
};

export const removeAllApiSpecsFromWorkspace = async (page: Page): Promise<void> => {
  await test.step('Remove every API spec from the workspace', async () => {
    const { sidebarItems } = buildApiSpecPanelLocators(page);

    let remaining = await sidebarItems().count();
    while (remaining > 0) {
      const row = page.getByTestId('sidebar-api-spec-row').first();
      await row.hover();
      await row.getByTestId('api-spec-actions').click();
      await page.getByTestId('api-spec-actions-remove').click();
      await page.getByTestId('modal-submit-btn').click();
      await expect(sidebarItems()).toHaveCount(remaining - 1);
      remaining -= 1;
    }
  });
};
