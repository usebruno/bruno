import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../../pages';
import { restoreDocumentsPath, stubDocumentsPath } from '../../../utils';
import {
  OpenCollectionPageId,
  buildOpenCollectionModalLocators,
  clickOutsideOpenCollectionModal,
  closeOpenCollectionModal,
  dragFileOutOfOpenCollectionModal,
  dragFileOverOpenCollectionModal,
  showOpenCollectionModal
} from '../../../pages/open-collection-modal/shell';

type MenuPage = {
  id: OpenCollectionPageId;
  label: string;
  title: string;
  description?: string;
};

const MENU_PAGES: MenuPage[] = [
  {
    id: 'recents',
    label: 'Recents',
    title: 'Recents',
    description: 'Collections you recently closed or opened'
  },
  {
    id: 'choose-folder',
    label: 'Choose folder',
    title: 'Choose folder',
    description: 'Collections from any folder you pick or drop here'
  },
  {
    id: 'import',
    label: 'Import file or URL',
    title: 'Import',
    description: 'Collections from export files and URLs'
  },
  {
    id: 'my-computer',
    label: 'My computer',
    title: 'My computer'
  },
  {
    id: 'registry',
    label: 'Registry',
    title: 'Registry',
    description: 'Collections published to your team’s private registry'
  },
  {
    id: 'api-catalog',
    label: 'API Catalog',
    title: 'API Catalog',
    description: 'Collections listed in Bruno’s public API catalog'
  }
];

test.describe('Open collection modal shell', () => {
  test.beforeAll(async ({ pageWithUserData, reuseOrLaunchElectronApp, createTmpDir }, testInfo) => {
    const app = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    await stubDocumentsPath(app, await createTmpDir('documents'));
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeOpenCollectionModal(page);
  });

  test.afterAll(async ({ reuseOrLaunchElectronApp }, testInfo) => {
    await restoreDocumentsPath(await reuseOrLaunchElectronApp({ testFile: testInfo.file }));
  });

  test('is a modal dialog named "Open collection"', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Verify the modal is a modal dialog named "Open collection"', async () => {
      await expect(openCollectionModal.root()).toHaveRole('dialog');
      await expect(openCollectionModal.root()).toHaveAccessibleName('Open collection');
      await expect(openCollectionModal.root()).toHaveAttribute('aria-modal', 'true');
    });
  });

  test('lists every page in the menu with the sources grouped last', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Verify the menu lists the pages in order, Recents first, with no shortcut next to them', async () => {
      await expect(openCollectionModal.menuItems()).toHaveText(MENU_PAGES.map(({ label }) => label));
    });

    await test.step('Verify My computer, Registry and API Catalog sit in the Sources group', async () => {
      await expect(openCollectionModal.menuSourceItems()).toHaveText(['My computer', 'Registry', 'API Catalog']);
    });
  });

  MENU_PAGES.forEach((menuPage, index) => {
    const previousPage = MENU_PAGES[(index + MENU_PAGES.length - 1) % MENU_PAGES.length];
    const { description } = menuPage;

    test(`shows ${menuPage.title} when its menu item is clicked`, async ({ pageWithUserData: page }) => {
      const openCollectionModal = buildOpenCollectionModalLocators(page);

      await test.step(`Show the ${previousPage.title} page`, async () => {
        await showOpenCollectionModal(page, previousPage.id);
      });

      await test.step(`Click "${menuPage.label}" in the menu`, async () => {
        await openCollectionModal.menuItem(menuPage.id).click();
      });

      await test.step(`Verify the ${menuPage.title} page and its header are shown`, async () => {
        await expect(openCollectionModal.pageView(menuPage.id)).toBeVisible();
        await expect(openCollectionModal.pageTitle()).toHaveText(menuPage.title);
        if (description) {
          await expect(openCollectionModal.pageDescription(description)).toBeVisible();
        }
      });

      await test.step(`Verify "${menuPage.label}" is the current menu item`, async () => {
        await expect(openCollectionModal.menuItem(menuPage.id)).toHaveAttribute('aria-current', 'page');
        await expect(openCollectionModal.menuItem(previousPage.id)).not.toHaveAttribute('aria-current');
      });
    });
  });

  test('closes when the close button is clicked', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Click the close button', async () => {
      await openCollectionModal.closeButton().click();
    });

    await test.step('Verify the modal is closed', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
    });
  });

  test('closes when Escape is pressed', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Press Escape', async () => {
      await page.keyboard.press('Escape');
    });

    await test.step('Verify the modal is closed', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
    });
  });

  test('closes when the backdrop is clicked', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Click the backdrop outside the modal', async () => {
      await clickOutsideOpenCollectionModal(page);
    });

    await test.step('Verify the modal is closed', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
    });
  });

  test('stays open when a click lands inside it', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Click the page title inside the modal', async () => {
      await openCollectionModal.pageTitle().click();
    });

    await test.step('Verify the modal still shows the Import page', async () => {
      await expect(openCollectionModal.root()).toBeVisible();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
    });
  });

  test('gives focus back to the folder icon when it closes', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Open the modal with the folder icon in the sidebar header', async () => {
      await sidebar.openCollectionButton().click();
      await expect(openCollectionModal.root()).toBeVisible();
    });

    await test.step('Click the close button', async () => {
      await openCollectionModal.closeButton().click();
    });

    await test.step('Verify the folder icon has focus again', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.openCollectionButton()).toBeFocused();
    });
  });

  test('moves focus through the menu with the arrow keys and wraps at both ends', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show Choose folder and focus its menu item', async () => {
      await showOpenCollectionModal(page, 'choose-folder');
      await openCollectionModal.menuItem('choose-folder').focus();
    });

    await test.step('Press ArrowDown', async () => {
      await page.keyboard.press('ArrowDown');
    });

    await test.step('Verify Import has focus', async () => {
      await expect(openCollectionModal.menuItem('import')).toBeFocused();
    });

    await test.step('Press ArrowUp twice', async () => {
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
    });

    await test.step('Verify focus wrapped to API Catalog', async () => {
      await expect(openCollectionModal.menuItem('api-catalog')).toBeFocused();
    });

    await test.step('Press ArrowDown', async () => {
      await page.keyboard.press('ArrowDown');
    });

    await test.step('Verify focus wrapped to Choose folder', async () => {
      await expect(openCollectionModal.menuItem('choose-folder')).toBeFocused();
    });
  });

  test('shows the drop overlay while a file is dragged over it', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Drag a file over the modal', async () => {
      await dragFileOverOpenCollectionModal(page);
    });

    await test.step('Verify the drop overlay is shown', async () => {
      await expect(openCollectionModal.dropOverlay()).toBeVisible();
      await expect(openCollectionModal.dropOverlay()).toContainText('Drop to open');
    });

    await test.step('Drag the file back out of the modal', async () => {
      await dragFileOutOfOpenCollectionModal(page);
    });

    await test.step('Verify the drop overlay is gone', async () => {
      await expect(openCollectionModal.dropOverlay()).toBeHidden();
    });
  });
});
