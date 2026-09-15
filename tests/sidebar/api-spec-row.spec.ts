import { test, expect } from '../../playwright';
import * as path from 'path';
import { buildApiSpecPanelLocators, openApiSpecFromDialog } from '../utils/page/openapi/render-spec';

const FIXTURES = path.resolve(__dirname, '..', 'import', 'openapi', 'fixtures');
const SPEC_A = { file: path.join(FIXTURES, 'openapi-simple.json'), name: 'Simple Test API' };
const SPEC_B = { file: path.join(FIXTURES, 'openapi-comprehensive.yaml'), name: 'Comprehensive API Test Collection' };

test.describe('API Spec sidebar row', () => {
  test.beforeAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      (dialog as any).__savedShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = (dialog as any).__savedShowOpenDialog;
      delete (dialog as any).__savedShowOpenDialog;
    });
  });

  // Re-opening an already open spec re-parses it and changes the active spec mid-test.
  const openBothSpecs = async (page, electronApp) => {
    const { sidebarRow } = buildApiSpecPanelLocators(page);
    for (const spec of [SPEC_A, SPEC_B]) {
      if ((await sidebarRow(spec.name).count()) === 0) {
        await openApiSpecFromDialog(page, electronApp, spec.file);
      }
      await expect(sidebarRow(spec.name)).toBeVisible();
    }
  };

  test('Enter on a focused row opens that spec', async ({ page, electronApp }) => {
    const { sidebarRow, panelHeading } = buildApiSpecPanelLocators(page);
    await openBothSpecs(page, electronApp);

    await test.step('Select spec A with the mouse', async () => {
      await sidebarRow(SPEC_A.name).click();
      await expect(sidebarRow(SPEC_A.name)).toHaveAttribute('data-selected', 'true');
    });

    await test.step('Focus spec B and press Enter', async () => {
      await sidebarRow(SPEC_B.name).focus();
      await page.keyboard.press('Enter');
    });

    await test.step('Spec B is selected and shown', async () => {
      await expect(sidebarRow(SPEC_B.name)).toHaveAttribute('data-selected', 'true');
      await expect(sidebarRow(SPEC_A.name)).not.toHaveAttribute('data-selected', 'true');
      await expect(panelHeading()).toBeVisible();
    });
  });

  test('Space on a focused row opens that spec', async ({ page, electronApp }) => {
    const { sidebarRow, panelHeading } = buildApiSpecPanelLocators(page);
    await openBothSpecs(page, electronApp);

    await test.step('Select spec B with the mouse', async () => {
      await sidebarRow(SPEC_B.name).click();
      await expect(sidebarRow(SPEC_B.name)).toHaveAttribute('data-selected', 'true');
    });

    await test.step('Focus spec A and press Space', async () => {
      await sidebarRow(SPEC_A.name).focus();
      await page.keyboard.press('Space');
    });

    await test.step('Spec A is selected and shown', async () => {
      await expect(sidebarRow(SPEC_A.name)).toHaveAttribute('data-selected', 'true');
      await expect(sidebarRow(SPEC_B.name)).not.toHaveAttribute('data-selected', 'true');
      await expect(panelHeading()).toBeVisible();
    });
  });

  test('Row actions menu opens from the actions icon', async ({ page, electronApp }) => {
    const { sidebarRow, sidebarRowActions, sidebarRowRemoveMenuItem } = buildApiSpecPanelLocators(page);
    await openBothSpecs(page, electronApp);

    await test.step('Hover the row and click its actions icon', async () => {
      await expect(async () => {
        await sidebarRow(SPEC_A.name).hover();
        await expect(sidebarRowActions(SPEC_A.name)).toBeVisible();
      }).toPass();
      await sidebarRowActions(SPEC_A.name).click();
    });

    await test.step('Menu is open', async () => {
      await expect(sidebarRowRemoveMenuItem()).toBeVisible();
    });
  });
});
