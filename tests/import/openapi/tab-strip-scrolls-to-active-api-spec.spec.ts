import { test, expect, Page } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import {
  openApiSpecFromDialog,
  openApiSpecSidebarItem,
  buildApiSpecPanelLocators,
  removeAllApiSpecsFromWorkspace
} from '../../utils/page/openapi/render-spec';
import { buildCommonLocators } from '../../utils/page/locators';
import { activeTabIsInStrip } from '../../utils/page/tab-strip';

const SPEC_COUNT = 12;
const specTitle = (index: number) => `Scroll Spec ${String(index).padStart(2, '0')}`;
const specFile = (index: number) => `scroll-spec-${String(index).padStart(2, '0')}.yaml`;

const writeSpec = (dir: string, index: number) => {
  const filePath = path.join(dir, specFile(index));
  fs.writeFileSync(
    filePath,
    `openapi: 3.0.0
info:
  title: ${specTitle(index)}
  version: 1.0.0
paths:
  /ping:
    get:
      responses:
        200:
          description: ok
`
  );
  return filePath;
};

const verticalPosition = (page: Page) =>
  page.evaluate(() => Math.round(document.scrollingElement?.scrollTop ?? 0));

test.describe('API spec tabs keep the active tab in view', () => {
  test.setTimeout(120000);

  test.beforeAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      (dialog as any).__savedShowOpenDialogForScroll = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = (dialog as any).__savedShowOpenDialogForScroll;
      delete (dialog as any).__savedShowOpenDialogForScroll;
    });
  });

  test.afterEach(async ({ page }) => {
    await removeAllApiSpecsFromWorkspace(page);
  });

  test('reveals the active spec tab without the user scrolling the strip', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const { sidebarItem } = buildApiSpecPanelLocators(page);
    const specsDir = await createTmpDir('api-spec-tab-scroll');

    for (let index = 1; index <= SPEC_COUNT; index += 1) {
      await openApiSpecFromDialog(page, electronApp, writeSpec(specsDir, index));
      await expect(sidebarItem(specTitle(index))).toBeVisible();
    }

    await test.step('the strip holds more tabs than it can show', async () => {
      await expect(locators.tabs.leftChevron()).toBeVisible();
    });

    await test.step('the spec opened last is already in view', async () => {
      await expect(locators.tabs.activeRequestTab()).toContainText(specFile(SPEC_COUNT));
      await expect.poll(() => activeTabIsInStrip(page)).toBe(true);
    });

    await test.step('switching to the first spec scrolls its tab back into view', async () => {
      const before = await verticalPosition(page);

      await openApiSpecSidebarItem(page, specTitle(1));

      await expect(locators.tabs.activeRequestTab()).toContainText(specFile(1));
      await expect.poll(() => activeTabIsInStrip(page)).toBe(true);
      expect(await verticalPosition(page)).toBe(before);
    });

    await test.step('and switching to a spec in the middle does the same', async () => {
      await openApiSpecSidebarItem(page, specTitle(7));

      await expect(locators.tabs.activeRequestTab()).toContainText(specFile(7));
      await expect.poll(() => activeTabIsInStrip(page)).toBe(true);
    });
  });
});
