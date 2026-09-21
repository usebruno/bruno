import { test, expect, Locator, Page, ElectronApplication } from '../../../../playwright';

const apiSpecsSection = (page: Page) =>
  page.locator('.sidebar-section').filter({ has: page.locator('.section-title', { hasText: 'API Specs' }) });

export const buildApiSpecPanelLocators = (page: Page) => ({
  addMenuButton: () => page.getByTestId('api-specs-header-add-menu'),
  openApiSpecMenuItem: () => page.getByTestId('api-specs-header-add-menu-open-api-spec'),
  section: () => apiSpecsSection(page),
  sectionContent: () => apiSpecsSection(page).locator('.section-content'),
  sidebarItems: () => page.locator('.api-spec-item'),
  sidebarItem: (name: string) => page.locator('.api-spec-item').filter({ hasText: name }),
  specEditor: () => page.locator('.api-spec-left-pane .CodeMirror'),
  specTab: (tabLabel: string) => page.locator('.request-tab').filter({ hasText: tabLabel }),
  tabUnsavedMarker: (tabLabel: string) =>
    page.locator('.request-tab').filter({ hasText: tabLabel }).locator('.close-gradient'),
  unsavedChangesDialog: () => page.locator('.bruno-modal').filter({ hasText: 'unsaved changes in the API spec' }),
  saveAndCloseButton: () => page.getByRole('button', { name: 'Save', exact: true }),
  sidebarRows: () => page.getByTestId('sidebar-api-spec-row'),
  sidebarRow: (name: string | RegExp) => page.getByTestId('sidebar-api-spec-row').filter({ hasText: name }),
  sidebarRowActions: (name: string | RegExp) => page.getByTestId('sidebar-api-spec-row').filter({ hasText: name }).getByTestId('api-spec-actions'),
  sidebarRowRemoveMenuItem: () => page.getByTestId('api-spec-actions-remove')
});

export const expandApiSpecsSection = async (page: Page): Promise<void> => {
  await test.step('Open the API Specs sidebar section', async () => {
    const { section, sectionContent } = buildApiSpecPanelLocators(page);
    const header = section().locator('.section-header');
    await header.waitFor();

    if ((await sectionContent().count()) === 0) {
      await header.click();
    }
    await expect(sectionContent()).toHaveCount(1);
  });
};

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

const openRowActionsMenu = async (row: Locator): Promise<void> => {
  await row.focus();
  await row.getByTestId('api-spec-actions').click();
};

export const removeApiSpecFromWorkspace = async (page: Page, name: string): Promise<void> => {
  await test.step(`Remove API spec "${name}" from the workspace`, async () => {
    const { sidebarRow, sidebarRowRemoveMenuItem } = buildApiSpecPanelLocators(page);
    await openRowActionsMenu(sidebarRow(name).first());
    await sidebarRowRemoveMenuItem().click();
    await page.getByTestId('modal-submit-btn').click();
  });
};

export const removeAllApiSpecsFromWorkspace = async (page: Page): Promise<void> => {
  await test.step('Remove every API spec from the workspace', async () => {
    const { sidebarRows, sidebarRowRemoveMenuItem, section } = buildApiSpecPanelLocators(page);

    if ((await section().count()) === 0) return;
    await expandApiSpecsSection(page);

    for (let pass = 0; pass < 20; pass += 1) {
      const remaining = await sidebarRows().count();
      if (remaining === 0) return;

      await openRowActionsMenu(sidebarRows().first());
      await sidebarRowRemoveMenuItem().click();
      await page.getByTestId('modal-submit-btn').click();
      await expect(sidebarRows()).toHaveCount(remaining - 1);
      await expect(page.getByTestId('modal-submit-btn')).toHaveCount(0);
    }
  });
};
