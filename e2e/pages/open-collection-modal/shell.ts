import { test, Page } from '../../playwright';
import { buildSidebarLocators } from '../sidebar/collection-tree';

export type OpenCollectionPageId = 'choose-folder' | 'import' | 'recents' | 'my-computer' | 'registry' | 'api-catalog';

export const buildOpenCollectionModalLocators = (page: Page) => {
  const root = () => page.getByTestId('open-collection-modal');
  const menu = () => page.getByTestId('open-collection-menu');

  return {
    root,
    backdrop: () => page.getByTestId('open-collection-backdrop'),
    closeButton: () => page.getByTestId('open-collection-close'),
    backButton: () => page.getByTestId('open-collection-back'),
    pageTitle: () => page.getByTestId('open-collection-page-title'),
    pageDescription: (text: string) => root().getByText(text, { exact: true }),
    pageView: (pageId: OpenCollectionPageId | 'locations') => page.getByTestId(`open-collection-page-${pageId}`),
    menu,
    menuItems: () => page.getByTestId(/^open-collection-menu-item-/),
    menuSourceItems: () => menu().getByRole('group', { name: 'Sources', exact: true }).getByTestId(/^open-collection-menu-item-/),
    menuItem: (pageId: OpenCollectionPageId) => page.getByTestId(`open-collection-menu-item-${pageId}`),
    menuItemShortcut: (pageId: OpenCollectionPageId) => page.getByTestId(`open-collection-menu-shortcut-${pageId}`),
    note: () => page.getByTestId('open-collection-note'),
    noteActionButton: () => page.getByTestId('open-collection-note-action'),
    noteDismissButton: () => page.getByTestId('open-collection-note-dismiss'),
    dropOverlay: () => page.getByTestId('open-collection-drop-overlay')
  };
};

export const showOpenCollectionModal = async (page: Page, pageId: OpenCollectionPageId) => {
  await test.step(`Show "${pageId}" in the Open collection modal`, async () => {
    const modal = buildOpenCollectionModalLocators(page);
    if (!(await modal.root().isVisible())) {
      await buildSidebarLocators(page).openCollectionButton().click();
      await modal.root().waitFor({ state: 'visible' });
    }
    await modal.menuItem(pageId).click();
    await modal.pageView(pageId).waitFor({ state: 'visible' });
  });
};

export const pressOpenCollectionShortcut = async (page: Page, pageId: 'import' | 'choose-folder', { keepFocus = false } = {}) => {
  await test.step(`Press the "${pageId}" shortcut`, async () => {
    if (!keepFocus) {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    }
    await page.keyboard.press(pageId === 'import' ? 'ControlOrMeta+o' : 'ControlOrMeta+Shift+o');
    await buildOpenCollectionModalLocators(page).pageView(pageId).waitFor({ state: 'visible' });
  });
};

export const closeOpenCollectionModal = async (page: Page) => {
  await test.step('Close the Open collection modal', async () => {
    const modal = buildOpenCollectionModalLocators(page);
    if (!(await modal.root().isVisible())) {
      return;
    }
    await modal.closeButton().click();
    await modal.root().waitFor({ state: 'hidden' });
  });
};

export const clickOutsideOpenCollectionModal = async (page: Page) => {
  await test.step('Click the backdrop outside the Open collection modal', async () => {
    await buildOpenCollectionModalLocators(page).backdrop().click({ position: { x: 5, y: 100 } });
  });
};

const dispatchFileDragEvent = async (page: Page, type: 'dragenter' | 'dragleave') => {
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['{}'], 'collection.json', { type: 'application/json' }));
    return transfer;
  });
  await buildOpenCollectionModalLocators(page).root().dispatchEvent(type, { dataTransfer });
  await dataTransfer.dispose();
};

export const dragFileOverOpenCollectionModal = async (page: Page) => {
  await test.step('Drag a file over the Open collection modal', async () => {
    await dispatchFileDragEvent(page, 'dragenter');
  });
};

export const dragFileOutOfOpenCollectionModal = async (page: Page) => {
  await test.step('Drag the file back out of the Open collection modal', async () => {
    await dispatchFileDragEvent(page, 'dragleave');
  });
};
