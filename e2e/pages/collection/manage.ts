import {
  test,
  expect,
  Page,
  ElectronApplication
} from '../../playwright';
import { buildDropdownLocators } from '../shared-ui/dropdown';
import { buildModalLocators } from '../shared-ui/modal';
import { revealCollectionsTop } from '../sidebar/collection-tree';

/**
 * Locators for the "+" menu in the sidebar Collections header (open / create / import).
 */
export const buildCollectionsPlusMenuLocators = (page: Page) => ({
  button: () => page.getByTestId('collections-header-add-menu'),
  openCollection: () => page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Open collection' }),
  createCollection: () => page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }),
  importCollection: () => page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' })
});

const buildLocators = (page: Page) => ({
  dropdown: buildDropdownLocators(page),
  modal: buildModalLocators(page),
  plusMenu: buildCollectionsPlusMenuLocators(page)
});

export type CollectionFormat = 'bru' | 'yml';

/**
 * Close all collections
 * @param page - The page object
 * @returns void
 */
export const closeAllCollections = async (page) => {
  await test.step('Close all collections', async () => {
    const numberOfCollections = await page.locator('[data-testid="collections"] .collection-name').count();

    for (let i = 0; i < numberOfCollections; i++) {
      const firstCollection = page.locator('[data-testid="collections"] .collection-name').first();
      await firstCollection.scrollIntoViewIfNeeded();

      const removeMenuItem = page.locator('.dropdown-item').getByText('Remove', { exact: true });
      await expect(async () => {
        await firstCollection.hover();
        await firstCollection.locator('.collection-actions .icon').click({ force: true });
        await expect(removeMenuItem).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 15000 });
      await removeMenuItem.click();

      // Wait for modal to appear - could be either regular remove or drafts confirmation
      const removeModal = page.locator('.bruno-modal').filter({ hasText: /Remove Collections?/ });
      await removeModal.waitFor({ state: 'visible', timeout: 5000 });

      // Check if it's the drafts confirmation modal (has "Discard All and Remove" button)
      const hasDiscardButton = await page.getByRole('button', { name: 'Discard All and Remove' }).isVisible().catch(() => false);

      if (hasDiscardButton) {
        // Drafts modal - the modal animates in and the footer can shift mid-frame,
        // causing Playwright's "element is stable" actionability check to fail
        // intermittently on slower machines. Use force to skip the stability check;
        // visibility is already verified above via waitFor.
        await page.getByRole('button', { name: 'Discard All and Remove' }).click({ force: true });
      } else {
        // Regular modal - click the submit button
        await page.locator('.bruno-modal-footer .submit').click();
      }

      // Wait for modal to close
      await removeModal.waitFor({ state: 'hidden', timeout: 5000 });
    }

    // Wait until no collections are left open (check sidebar only)
    await expect(page.getByTestId('collections').locator('.collection-name')).toHaveCount(0);
  });
};

/**
 * Open a collection from the sidebar and accept the JavaScript Sandbox modal
 * @param page - The page object
 * @param collectionName - The name of the collection to open
 * @returns void
 */
export const openCollection = async (page: Page, collectionName: string) => {
  await test.step(`Open collection "${collectionName}"`, async () => {
    await revealCollectionsTop(page);
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
  });
};

/**
 * Open a collection living at an arbitrary filesystem path via the native "Open Collection"
 * flow — mocks `dialog.showOpenDialog` to return `collectionPath` directly (no real file
 * picker), then drives the "+" menu's "Open collection" item. Useful for loading a committed
 * fixture collection copied to a tmp dir (e.g. via the `collectionFixturePath` fixture).
 * @param page - The page object
 * @param electronApp - The Electron application object
 * @param collectionPath - Absolute path to the collection folder to open
 * @returns void
 */
export const openCollectionFromDialog = async (page: Page, electronApp: ElectronApplication, collectionPath: string) => {
  await test.step(`Open collection from dialog at "${collectionPath}"`, async () => {
    await electronApp.evaluate(({ dialog }, dir) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
    }, collectionPath);

    const locators = buildLocators(page);
    await locators.plusMenu.button().click();
    await locators.plusMenu.openCollection().click();
  });
};

/**
 * Create a collection
 * @param page - The page object
 * @param collectionName - The name of the collection to create
 * @param collectionLocation - The location of the collection to create (eg)
 * @param options - The options for creating the collection
 *
 * @returns void
 */
export const createCollection = async (
  page,
  collectionName: string,
  collectionLocation: string,
  format: CollectionFormat = 'yml'
) => {
  await test.step(`Create ${format} collection "${collectionName}"`, async () => {
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();

    // Wait for inline creator to appear, then click the cog button to open advanced modal
    const inlineCreator = page.locator('.inline-collection-creator');
    await inlineCreator.waitFor({ state: 'visible', timeout: 5000 });
    await inlineCreator.locator('.cog-btn').click();

    const createCollectionModal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Collection' });
    await createCollectionModal.waitFor({ state: 'visible', timeout: 5000 });

    // Fill location FIRST — some modals auto-derive the name from the path,
    // so filling name after location ensures it isn't overwritten.
    //
    // The location input is `readOnly={true}` as a React prop and is a
    // controlled input via formik. Two implications:
    //   1. Removing `readonly` via DOM attribute is racy — the next React
    //      render restores the prop. The modal's mount-effect focuses the
    //      name field at +50ms, which can trigger that re-render between
    //      our DOM tweak and the `fill()`, leaving the input read-only and
    //      the fill silently no-ops.
    //   2. Even if writable, controlled inputs require firing an `input`
    //      event so the onChange handler runs and updates formik state.
    // Use the native value setter (the React-controlled-input pattern) to
    // bypass both. Then verify the value stuck so we fail loudly here
    // instead of opaquely at the modal-hidden wait when Yup validation
    // silently rejects an empty location.
    const locationInput = createCollectionModal.getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.evaluate((el, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, collectionLocation);
      await expect(locationInput).toHaveValue(collectionLocation);
    }
    const nameInput = createCollectionModal.getByLabel('Name');
    await nameInput.clear();
    await nameInput.fill(collectionName);
    // Verify the name is correct before creating
    await expect(nameInput).toHaveValue(collectionName, { timeout: 2000 });

    if (format) {
      const advancedBtn = createCollectionModal.locator('.advanced-options .btn-advanced');
      const showAdvancedOptionsToggle = page.getByTestId('show-advanced-options-toggle');
      const formatSelect = createCollectionModal.locator('#format');

      await expect(async () => {
        if (!(await formatSelect.isVisible())) {
          await advancedBtn.click();
          await showAdvancedOptionsToggle.click({ timeout: 2000 });
        }
        await expect(formatSelect).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 15000 });

      await formatSelect.selectOption(format);
    }

    await createCollectionModal.getByRole('button', { name: 'Create', exact: true }).click();

    // The modal closes via `onClose()` in the form's `onSubmit` success path,
    // which only runs after Yup validation passes — so this waitFor is the
    // signal that the form actually submitted
    await createCollectionModal.waitFor({ state: 'hidden', timeout: 5000 });
    await expect(page.locator('.bruno-modal-backdrop')).toHaveCount(0);
    // Wait for the collection name to appear in the sidebar before proceeding
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).waitFor({ state: 'visible', timeout: 5000 });
    await openCollection(page, collectionName);
  });
};

/**
 * Delete a collection permanently from disk via the workspace overview page
 * @param page - The page object
 * @param collectionName - The name of the collection to delete
 * @returns void
 */
export const deleteCollectionFromOverview = async (page: Page, collectionName: string) => {
  await test.step(`Delete collection "${collectionName}" from workspace overview`, async () => {
    // Navigate to workspace overview
    await page.locator('.home-button').click();
    const overviewTab = page.locator('.request-tab').filter({ hasText: 'Overview' });
    await overviewTab.click();

    // Find the collection card and open its menu
    const collectionCard = page.locator('.collection-card').filter({ hasText: collectionName });
    await collectionCard.waitFor({ state: 'visible', timeout: 5000 });
    await collectionCard.locator('.collection-menu').click();

    // Click Delete from the dropdown
    await page.locator('.dropdown-item').filter({ hasText: 'Delete' }).click();

    // Wait for delete confirmation modal
    const deleteModal = page.locator('.bruno-modal').filter({ hasText: 'Delete Collection' });
    await deleteModal.waitFor({ state: 'visible', timeout: 5000 });

    // Type 'delete' to confirm
    await deleteModal.locator('#delete-confirm-input').fill('delete');

    // Click the Delete button
    await deleteModal.getByRole('button', { name: 'Delete', exact: true }).click();

    // Wait for modal to close
    await deleteModal.waitFor({ state: 'hidden', timeout: 10000 });
  });
};

export const closeOpenCollectionModal = async (page: Page) => {
  await test.step('Close the Open Collection modal', async () => {
    const locators = buildLocators(page);
    await locators.modal.closeButton().click();
    await locators.modal.byTitle('Open Collection').waitFor({ state: 'hidden' });
  });
};

/**
 * Remove a specific collection from the sidebar
 * @param page - The page object
 * @param collectionName - The name of the collection to remove
 * @returns void
 */
export const removeCollection = async (page: Page, collectionName: string) => {
  await test.step(`Remove collection "${collectionName}"`, async () => {
    const locators = buildLocators(page);
    const collectionRow = page.locator('.collection-name').filter({
      has: page.locator('#sidebar-collection-name', { hasText: collectionName })
    });

    await collectionRow.hover();
    await collectionRow.locator('.collection-actions .icon').click();
    await locators.dropdown.item('Remove').click();

    // Wait for modal to appear - could be either regular remove or drafts confirmation
    const removeModal = page.locator('.bruno-modal').filter({ hasText: /Remove Collections?/ });
    await removeModal.waitFor({ state: 'visible', timeout: 5000 });

    // Check if it's the drafts confirmation modal (has "Discard All and Remove" button)
    const hasDiscardButton = await page.getByRole('button', { name: 'Discard All and Remove' }).isVisible().catch(() => false);

    if (hasDiscardButton) {
      // Drafts modal - click "Discard All and Remove"
      await page.getByRole('button', { name: 'Discard All and Remove' }).click();
    } else {
      // Regular modal - click Remove button
      await locators.modal.button('Remove').click();
    }

    // Wait for modal to close
    await removeModal.waitFor({ state: 'hidden', timeout: 5000 });

    // Verify collection is removed
    await expect(
      page.locator('#sidebar-collection-name').filter({ hasText: collectionName })
    ).not.toBeVisible();
  });
};
