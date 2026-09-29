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
  saveAndCloseButton: () => page.getByTestId('api-spec-save'),
  sidebarRows: () => page.getByTestId('sidebar-api-spec-row'),
  sidebarRow: (name: string | RegExp) => page.getByTestId('sidebar-api-spec-row').filter({ hasText: name }),
  sidebarRowActions: (name: string | RegExp) => page.getByTestId('sidebar-api-spec-row').filter({ hasText: name }).getByTestId('api-spec-actions')
});

export const buildApiSpecRowMenuLocators = (page: Page) => {
  const openMenu = () => page.getByTestId('api-spec-actions-dropdown');

  return {
    menuItems: () => openMenu().getByRole('menuitem'),
    menuItemIds: () => openMenu().getByRole('menuitem').evaluateAll((items) => items.map((item) => item.getAttribute('data-item-id'))),
    menuItem: (id: string) => openMenu().getByTestId(`api-spec-actions-${id}`),
    menuDivider: () => openMenu().getByRole('separator'),
    removeModal: () => page.getByTestId('remove-api-spec-modal'),
    removeSubmit: () => page.getByTestId('remove-api-spec-modal-submit-btn'),
    removeCancel: () => page.getByTestId('remove-api-spec-modal').getByRole('button', { name: 'Cancel', exact: true }),
    deleteModal: () => page.getByTestId('delete-api-spec-modal'),
    deleteSubmit: () => page.getByTestId('delete-api-spec-modal-submit-btn'),
    deleteCancel: () => page.getByTestId('delete-api-spec-modal').getByRole('button', { name: 'Cancel', exact: true }),
    connectedCollectionsWarning: () => page.getByTestId('api-spec-connected-collections-warning')
  };
};

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

export const createApiSpec = async (
  page: Page,
  electronApp: ElectronApplication,
  name: string,
  location: string
): Promise<void> => {
  await test.step(`Create API spec "${name}" in ${location}`, async () => {
    await electronApp.evaluate(({ dialog }, location) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [location] });
    }, location);

    const { addMenuButton } = buildApiSpecPanelLocators(page);
    await addMenuButton().click();
    await page.getByTestId('api-specs-header-add-menu-create-api-spec').click();

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Create API Spec' });
    await expect(modal).toBeVisible();

    await modal.locator('#api-spec-name').fill(name);
    await modal.locator('#api-spec-location').click();
    await expect(modal.locator('#api-spec-location')).toHaveValue(location);

    await modal.getByTestId('modal-submit-btn').click();
    await expect(modal).toHaveCount(0);
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

const openRowActionsMenu = async (page: Page, row: Locator): Promise<void> => {
  await row.focus();
  await row.getByTestId('api-spec-actions').click();
  await buildApiSpecRowMenuLocators(page).menuItems().first().waitFor({ state: 'visible' });
};

export const openApiSpecRowMenu = async (page: Page, name: string): Promise<void> => {
  await test.step(`Open the actions menu of API spec "${name}"`, async () => {
    await openRowActionsMenu(page, buildApiSpecPanelLocators(page).sidebarRow(name));
  });
};

export const chooseApiSpecRowAction = async (page: Page, name: string, actionId: string): Promise<void> => {
  await openApiSpecRowMenu(page, name);
  await test.step(`Choose "${actionId}"`, async () => {
    await buildApiSpecRowMenuLocators(page).menuItem(actionId).click();
  });
};

const removeApiSpecRow = async (page: Page, row: Locator): Promise<void> => {
  const { menuItem, removeSubmit } = buildApiSpecRowMenuLocators(page);
  await openRowActionsMenu(page, row);
  await menuItem('remove').click();
  await removeSubmit().click();
};

export const removeApiSpecFromWorkspace = async (page: Page, name: string): Promise<void> => {
  await test.step(`Remove API spec "${name}" from the workspace`, async () => {
    const { sidebarRow } = buildApiSpecPanelLocators(page);
    await removeApiSpecRow(page, sidebarRow(name).first());
  });
};

export const removeAllApiSpecsFromWorkspace = async (page: Page): Promise<void> => {
  await test.step('Remove every API spec from the workspace', async () => {
    const { sidebarRows, section } = buildApiSpecPanelLocators(page);
    const { removeSubmit } = buildApiSpecRowMenuLocators(page);

    if ((await section().count()) === 0) return;
    await expandApiSpecsSection(page);

    for (let pass = 0; pass < 20; pass += 1) {
      const remaining = await sidebarRows().count();
      if (remaining === 0) return;

      await removeApiSpecRow(page, sidebarRows().first());
      await expect(sidebarRows()).toHaveCount(remaining - 1);
      await expect(removeSubmit()).toHaveCount(0);
    }
  });
};
