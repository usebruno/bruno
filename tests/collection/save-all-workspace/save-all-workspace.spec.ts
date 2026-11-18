import fs from 'fs';
import path from 'path';
import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createExampleFromSidebar,
  createRequest,
  createTransientRequest,
  fillRequestUrl,
  openExampleFromSidebar,
  openRequest,
  saveTransientViaModal
} from '../../utils/page';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const firstCollection = 'save-all-one';
const secondCollection = 'save-all-two';

const richRequestFile = `info:
  name: rich-request
  type: http
  seq: 10
  tags:
    - hello

http:
  method: GET
  url: localhost:4000/posts
  headers:
    - name: x-api-key
      value: admin
  auth: inherit

runtime:
  scripts:
    - type: tests
      code: console.log('tests')

settings:
  encodeUrl: true
  timeout: 0
  followRedirects: true
  maxRedirects: 5
  forwardAuthorizationHeader: false

examples:
  - name: rich-example
    description: an example
    request:
      url: localhost:4000/posts
      method: GET
      headers:
        - name: x-api-key
          value: admin
    response:
      status: 200
      statusText: OK
      body:
        type: text
        data: ""

docs: hello docs
`;

const readAllFiles = (dir: string): string =>
  fs.readdirSync(dir, { withFileTypes: true })
    .map((entry) => {
      const entryPath = path.join(dir, entry.name);
      return entry.isDirectory() ? readAllFiles(entryPath) : fs.readFileSync(entryPath, 'utf8');
    })
    .join('\n');

const saveAllMenuItem = (page: Page) => buildCommonLocators(page).sidebar.saveAllButton();

const draftIndicatorOf = (page: Page, requestName: string) => {
  const { tabs } = buildCommonLocators(page);
  return tabs.tabDraftIndicator(tabs.requestTab(requestName).locator('..'));
};

const openCollectionsMenu = async (page: Page) => {
  await buildCommonLocators(page).sidebar.collectionsActionsMenu().click();
  await expect(saveAllMenuItem(page)).toBeVisible();
};

const editRequestUrl = async (page: Page, collectionName: string, requestName: string, url: string) => {
  await openRequest(page, collectionName, requestName, { persist: true });
  await fillRequestUrl(page, url, { replace: true });
  await expect(draftIndicatorOf(page, requestName)).toBeVisible();
};

test.describe('Save all across the workspace', () => {
  let collectionsDir: string;

  test.beforeEach(async ({ page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    await closeAllCollections(page);

    collectionsDir = await createTmpDir('save-all-workspace');
    await createCollection(page, firstCollection, collectionsDir);
    await createRequest(page, 'req-one', firstCollection, { url: 'https://example.com/one' });
    await createCollection(page, secondCollection, collectionsDir);
    await createRequest(page, 'req-two', secondCollection, { url: 'https://example.com/two' });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('menu item saves drafts in every collection of the workspace', async ({ page }) => {
    await test.step('Save all is disabled while nothing is unsaved', async () => {
      await openCollectionsMenu(page);
      await expect(saveAllMenuItem(page)).toHaveAttribute('aria-disabled', 'true');
      await page.keyboard.press('Escape');
    });

    await test.step('Edit a request in each collection', async () => {
      await editRequestUrl(page, firstCollection, 'req-one', 'https://example.com/one-edited');
      await editRequestUrl(page, secondCollection, 'req-two', 'https://example.com/two-edited');
    });

    await test.step('Save all from the Collections menu', async () => {
      await openCollectionsMenu(page);
      await expect(saveAllMenuItem(page)).not.toHaveAttribute('aria-disabled', 'true');
      await saveAllMenuItem(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Both requests are written to disk and their tabs are clean', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/one-edited');
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/two-edited');

      await expect(draftIndicatorOf(page, 'req-two')).not.toBeVisible();
      await openRequest(page, firstCollection, 'req-one', { persist: true });
      await expect(draftIndicatorOf(page, 'req-one')).not.toBeVisible();
    });

    await test.step('Save all is disabled again', async () => {
      await openCollectionsMenu(page);
      await expect(saveAllMenuItem(page)).toHaveAttribute('aria-disabled', 'true');
      await page.keyboard.press('Escape');
    });
  });

  test('shortcut saves drafts across collections, then asks where to save a transient request', async ({ page }) => {
    await test.step('Edit a request in each collection and a transient request', async () => {
      await editRequestUrl(page, firstCollection, 'req-one', 'https://example.com/one-shortcut');
      await editRequestUrl(page, secondCollection, 'req-two', 'https://example.com/two-shortcut');
      await createTransientRequest(page);
      await fillRequestUrl(page, 'https://example.com/transient-draft', { replace: true });
      await expect(buildCommonLocators(page).tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Press the workspace save-all shortcut', async () => {
      await page.keyboard.press(`${modifier}+Alt+KeyS`);
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Saved requests are on disk; the transient request is not yet', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/one-shortcut');
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/two-shortcut');
      expect(readAllFiles(collectionsDir)).not.toContain('https://example.com/transient-draft');
    });

    await test.step('The save dialog opens for the transient request and saves it', async () => {
      await saveTransientViaModal(page, 'transient-saved', { collectionName: secondCollection });
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/transient-draft');
    });
  });

  test('menu item saves a request whose only unsaved change is an example', async ({ page }) => {
    await test.step('Create an example and rename it without saving', async () => {
      await createExampleFromSidebar(page, 'req-one', 'example-created');
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('example-created');
      await page.getByTestId('response-example-name-input').fill('example-renamed');
      expect(readAllFiles(collectionsDir)).not.toContain('example-renamed');
    });

    await test.step('Save all from the Collections menu', async () => {
      await openCollectionsMenu(page);
      await expect(saveAllMenuItem(page)).not.toHaveAttribute('aria-disabled', 'true');
      await saveAllMenuItem(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('The renamed example is on disk', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('example-renamed');
    });
  });

  test('menu item clears the unsaved indicator of a request with scripts, docs and an example', async ({ page }) => {
    await test.step('Add a request file with tags, tests, settings, docs and an example', async () => {
      fs.writeFileSync(path.join(collectionsDir, firstCollection, 'rich-request.yml'), richRequestFile);
      await openRequest(page, firstCollection, 'rich-request', { persist: true });
    });

    await test.step('Rename its example without saving', async () => {
      await openExampleFromSidebar(page, 'rich-request', 'rich-example');
      await page.getByTestId('response-example-edit-btn').click();
      await page.getByTestId('response-example-name-input').fill('rich-example-renamed');
      await expect(buildCommonLocators(page).tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Save all from the Collections menu', async () => {
      await openCollectionsMenu(page);
      await saveAllMenuItem(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('The change is on disk and the tab is clean', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('rich-example-renamed');
      await expect(buildCommonLocators(page).tabs.draftIndicator()).not.toBeVisible();
      await expect(page.getByTestId('response-example-save-btn')).not.toBeVisible();
      await expect(page.getByTestId('response-example-edit-btn')).toBeVisible();
    });
  });

  test('shortcut saves an example edit while focus is in the example name field', async ({ page }) => {
    await test.step('Create an example and rename it, keeping focus in the name field', async () => {
      await createExampleFromSidebar(page, 'req-one', 'example-created');
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('example-created');
      const nameInput = page.getByTestId('response-example-name-input');
      await nameInput.fill('example-renamed-by-shortcut');
      await expect(nameInput).toBeFocused();
    });

    await test.step('Press the workspace save-all shortcut', async () => {
      await page.keyboard.press(`${modifier}+Alt+KeyS`);
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('example-renamed-by-shortcut');
      await expect(page.getByTestId('response-example-save-btn')).not.toBeVisible();
    });
  });

  test('menu item is enabled for an edited scratch request and asks where to save it', async ({ page }) => {
    await test.step('Edit a scratch request on the workspace overview', async () => {
      await page.locator('.home-button').click();
      await createTransientRequest(page);
      await fillRequestUrl(page, 'https://example.com/scratch-draft', { replace: true });
      await expect(buildCommonLocators(page).tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Save all from the Collections menu', async () => {
      await openCollectionsMenu(page);
      await expect(saveAllMenuItem(page)).not.toHaveAttribute('aria-disabled', 'true');
      await saveAllMenuItem(page).click();
    });

    await test.step('The save dialog opens for the scratch request and saves it', async () => {
      await saveTransientViaModal(page, 'scratch-saved', { collectionName: firstCollection });
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/scratch-draft');
    });
  });
});
