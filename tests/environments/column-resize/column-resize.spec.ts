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

    await test.step('Resized widths are restored after switching environments', async () => {
      await dragEnvironmentColumnDivider(page, 'name', 120);
      const resized = await getEnvironmentColumnWidths(page);

      // A second environment to switch to; switching remounts the table, so Alpha's widths
      // must come back from the stored state. Skip creating it if a retry already did.
      const betaExists = await environment.sidebarListItemExact('collection', 'Beta').isVisible().catch(() => false);
      if (!betaExists) {
        await createEnvironment(page, 'Beta');
      }
      await openEnvironmentInSettings(page, 'Beta');
      await openEnvironmentInSettings(page, 'Alpha');
      await expect(environment.varRow('token')).toBeVisible();

      const restored = await getEnvironmentColumnWidths(page);
      expectClose(restored.name, resized.name);
      expectClose(restored.value, resized.value);
      expectClose(restored.description, resized.description);
    });
  });
});
