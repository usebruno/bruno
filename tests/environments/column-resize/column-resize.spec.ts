import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  openCollection,
  selectEnvironment,
  createEnvironment,
  openEnvironmentConfigTab,
  openEnvironmentInSettings,
  getEnvironmentColumnWidths,
  dragEnvironmentColumnDivider
} from '../../utils/page';

const MIN_COLUMN_WIDTH = 80;
// Name / Value / Description proportions; must match DEFAULT_COLUMN_WIDTHS in EnvironmentVariablesTable
const DEFAULT_COLUMN_PROPORTIONS = { name: 20, value: 45, description: 35 };

const expectClose = (actual: number, expected: number) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(2);
};

test.describe('Environment variables table - column resize', () => {
  test('resizes only the adjacent columns, clamps at the minimum and keeps widths per environment', async ({
    pageWithUserData: page
  }) => {
    const { environment } = buildCommonLocators(page);

    await test.step('Open the Alpha environment variables', async () => {
      await openCollection(page, 'env-column-resize');
      await selectEnvironment(page, 'Alpha');
      await openEnvironmentConfigTab(page);
      await openEnvironmentInSettings(page, 'Alpha');
      await expect(environment.varRow('host')).toBeVisible();
    });

    await test.step('Dragging the Name divider resizes only Name and Value', async () => {
      const before = await getEnvironmentColumnWidths(page);
      await dragEnvironmentColumnDivider(page, 'name', 60);
      const after = await getEnvironmentColumnWidths(page);

      expectClose(after.name, before.name + 60);
      expectClose(after.value, before.value - 60);
      expectClose(after.description, before.description);
    });

    await test.step('Dragging the Value divider resizes only Value and Description', async () => {
      const before = await getEnvironmentColumnWidths(page);
      await dragEnvironmentColumnDivider(page, 'value', -50);
      const after = await getEnvironmentColumnWidths(page);

      expectClose(after.value, before.value - 50);
      expectClose(after.description, before.description + 50);
      expectClose(after.name, before.name);
    });

    await test.step('A column cannot be dragged below the minimum width', async () => {
      const before = await getEnvironmentColumnWidths(page);
      await dragEnvironmentColumnDivider(page, 'name', -2000);
      const after = await getEnvironmentColumnWidths(page);

      expectClose(after.name, MIN_COLUMN_WIDTH);
      expectClose(after.value, before.value + (before.name - MIN_COLUMN_WIDTH));
      expectClose(after.description, before.description);
    });

    await test.step('Releasing a divider drag over the Name header does not change the sort', async () => {
      await expect(environment.visibleNameInputs().nth(0)).toHaveValue('token');
      await expect(environment.visibleNameInputs().nth(1)).toHaveValue('host');

      // resize beyond the minimum width so the divider stops and the pointer is released over the Name header
      const before = await getEnvironmentColumnWidths(page);
      await dragEnvironmentColumnDivider(page, 'name', -(before.name - MIN_COLUMN_WIDTH) - 30);

      expectClose((await getEnvironmentColumnWidths(page)).name, MIN_COLUMN_WIDTH);
      await expect(environment.visibleNameInputs().nth(0)).toHaveValue('token');
      await expect(environment.visibleNameInputs().nth(1)).toHaveValue('host');
    });

    let resized: { name: number; value: number; description: number };

    await test.step('Resize Alpha Name column well above its default width', async () => {
      // Keeps Alpha clearly different from Beta's default layout, so they can't match by chance
      const current = await getEnvironmentColumnWidths(page);
      const defaultName = ((current.name + current.value + current.description) * DEFAULT_COLUMN_PROPORTIONS.name) / 100;
      await dragEnvironmentColumnDivider(page, 'name', defaultName + 100 - current.name);

      resized = await getEnvironmentColumnWidths(page);
      expectClose(resized.name, defaultName + 100);
    });

    await test.step('Switch to the Beta environment', async () => {
      const betaExists = await environment.sidebarListItemExact('collection', 'Beta').isVisible().catch(() => false);
      if (!betaExists) {
        await createEnvironment(page, 'Beta');
      }
      await openEnvironmentInSettings(page, 'Beta');
    });

    await test.step('Beta shows the default layout, not Alpha widths', async () => {
      const beta = await getEnvironmentColumnWidths(page);
      const available = beta.name + beta.value + beta.description;
      expectClose(beta.name, (available * DEFAULT_COLUMN_PROPORTIONS.name) / 100);
      expectClose(beta.value, (available * DEFAULT_COLUMN_PROPORTIONS.value) / 100);
      expectClose(beta.description, (available * DEFAULT_COLUMN_PROPORTIONS.description) / 100);
    });

    await test.step('Switching back restores Alpha resized widths', async () => {
      await openEnvironmentInSettings(page, 'Alpha');
      await expect(environment.varRow('token')).toBeVisible();

      const restored = await getEnvironmentColumnWidths(page);
      expectClose(restored.name, resized.name);
      expectClose(restored.value, resized.value);
      expectClose(restored.description, resized.description);
    });
  });
});
