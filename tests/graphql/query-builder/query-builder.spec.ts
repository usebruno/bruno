import { test, expect, Page } from '../../../playwright';
import { closeAllCollections, openRequest } from '../../utils/page';

const qb = (page: Page) => page.locator('.graphql-query-builder-container');

const getQueryEditorContent = async (page: Page) => {
  const editor = page.locator('[aria-label="Query Editor"] .CodeMirror').first();
  await expect(editor).toBeVisible();
  return await editor.evaluate((el) => (el as any).CodeMirror?.getValue() || '') as string;
};

const ensureVariablesPaneOpen = async (page: Page) => {
  const variablesEditor = page.locator('.variables-section .CodeMirror').first();
  if (!(await variablesEditor.isVisible())) {
    await page.locator('.variables-header').click();
    await expect(variablesEditor).toBeVisible();
  }
};

const getVariablesEditorContent = async (page: Page) => {
  await ensureVariablesPaneOpen(page);
  const editor = page.locator('.variables-section .CodeMirror').first();
  return await editor.evaluate((el) => (el as any).CodeMirror?.getValue() || '') as string;
};

test.describe('GraphQL Query Builder', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('Select fields and generate a query', async ({ pageWithUserData: page }) => {
    await test.step('Open GraphQL request, Query Builder, and load schema', async () => {
      await openRequest(page, 'graphql-query-builder', 'test-graphql');
      await page.locator('.tabs').waitFor({ state: 'visible' });

      // Open query builder via dedicated button
      if (!(await page.locator('.graphql-query-builder-container').isVisible())) {
        const queryBuilderBtn = page.getByRole('tablist').locator('button[title="Show Query Builder"]');
        await queryBuilderBtn.waitFor({ state: 'visible' });
        await queryBuilderBtn.click();
      }

      await expect(qb(page)).toBeVisible();

      // Load schema via introspection
      const dotsMenu = page.getByRole('tablist').locator('button[title="More actions"]');
      await dotsMenu.waitFor({ state: 'visible' });
      await dotsMenu.click();
      const introspectionItem = page.locator('[data-testid="menu-dropdown-schema-introspection"]');
      await introspectionItem.waitFor({ state: 'visible' });
      await introspectionItem.click();
      await expect(page.getByText('GraphQL Schema loaded successfully').first()).toBeVisible({ timeout: 15000 });

      await expect(qb(page).locator('.query-builder-tree')).toBeVisible();
    });

    await test.step('Click on "Media" field to expand it', async () => {
      const mediaField = qb(page).locator('.field-node').filter({ hasText: /^Media/ }).first();
      await mediaField.click();
      await expect(qb(page).locator('.section-header').filter({ hasText: 'ARGUMENTS' }).first()).toBeVisible();
    });

    await test.step('Check the "Media" field checkbox', async () => {
      const mediaCheckbox = qb(page).locator('.field-node').filter({ hasText: /^Media/ }).first().locator('.field-checkbox');
      await mediaCheckbox.check();
      await expect(mediaCheckbox).toBeChecked();
    });

    await test.step('Check child fields: id, description, bannerImage', async () => {
      const fieldsSection = qb(page).locator('.query-builder-tree');

      const idField = fieldsSection.locator('.field-node').filter({ hasText: /^id\b/ }).first();
      await idField.locator('.field-checkbox').check();

      const descField = fieldsSection.locator('.field-node').filter({ hasText: /^description/ }).first();
      await descField.locator('.field-checkbox').check();

      const bannerField = fieldsSection.locator('.field-node').filter({ hasText: /^bannerImage/ }).first();
      await bannerField.locator('.field-checkbox').check();
    });

    await test.step('Verify query is generated in the editor', async () => {
      // Poll to allow the 150ms debounce to fire
      await expect.poll(() => getQueryEditorContent(page)).toContain('id');
      const editorContent = await getQueryEditorContent(page);
      expect(editorContent).toContain('id');
      expect(editorContent).toContain('description');
      expect(editorContent).toContain('bannerImage');
    });
  });

  test('Enable argument and set value', async ({ pageWithUserData: page }) => {
    await test.step('Expand "Character" field to show arguments', async () => {
      const characterField = qb(page).locator('.field-node').filter({ hasText: /^Character/ }).first();
      await characterField.click();
      await expect(qb(page).locator('.section-header').filter({ hasText: 'ARGUMENTS' }).first()).toBeVisible();
    });

    await test.step('Check the "Character" field', async () => {
      const characterCheckbox = qb(page)
        .locator('.field-node')
        .filter({ hasText: /^Character/ })
        .first()
        .locator('.field-checkbox');
      await characterCheckbox.check();
    });

    await test.step('Enable the "id" argument and set a value', async () => {
      const argRow = qb(page).locator('.arg-row').filter({ has: page.locator('.arg-name', { hasText: /^id$/ }) }).first();
      await expect(argRow).toBeVisible();
      const argCheckbox = argRow.locator('.field-checkbox');
      await argCheckbox.check();
      await expect(argCheckbox).toBeChecked();

      const argInput = argRow.locator('input[type="text"]');
      await expect(argInput).toBeVisible();
      await argInput.fill('123');
    });

    await test.step('Check child field "gender"', async () => {
      const genderField = qb(page).locator('.field-node').filter({ hasText: /^gender/ }).first();
      await genderField.locator('.field-checkbox').check();
    });

    await test.step('Verify generated query contains the argument', async () => {
      await expect.poll(() => getQueryEditorContent(page)).toContain('$id');
      const editorContent = await getQueryEditorContent(page);
      expect(editorContent).toContain('gender');
      expect(editorContent).toContain('$id');
    });

    await test.step('Verify variables pane contains the argument value', async () => {
      const variablesContent = await getVariablesEditorContent(page);
      expect(variablesContent).toContain('"id"');
      expect(variablesContent).toContain('123');
    });
  });

  test('Expand nested object types', async ({ pageWithUserData: page }) => {
    await test.step('Expand "Staff" field', async () => {
      const staffField = qb(page).locator('.field-node').filter({ hasText: /^Staff/ }).first();
      await staffField.click();
    });

    await test.step('Check "Staff" and expand "name" nested field', async () => {
      const staffCheckbox = qb(page).locator('.field-node').filter({ hasText: /^Staff/ }).first().locator('.field-checkbox');
      await staffCheckbox.check();

      const descField = qb(page).locator('.field-node').filter({ hasText: /^description/ }).first();
      await descField.locator('.field-checkbox').check();

      const nameField = qb(page).locator('.field-node').filter({ hasText: /^name/ }).first();
      await nameField.click();
    });

    await test.step('Select nested name fields', async () => {
      const nameCheckbox = qb(page).locator('.field-node').filter({ hasText: /^name/ }).first().locator('.field-checkbox');
      await nameCheckbox.check();

      const firstField = qb(page).locator('.field-node').filter({ hasText: /^first/ }).first();
      await firstField.locator('.field-checkbox').check();
    });

    await test.step('Verify nested query structure in editor', async () => {
      await expect.poll(() => getQueryEditorContent(page)).toContain('Staff');
      const editorContent = await getQueryEditorContent(page);
      expect(editorContent).toContain('description');
      expect(editorContent).toContain('name');
      expect(editorContent).toContain('first');
    });
  });

  test('Removing a field in code editor unchecks it in query builder', async ({ pageWithUserData: page }) => {
    await test.step('Ensure "Media" is expanded with child fields id, description, bannerImage checked', async () => {
      const mediaField = qb(page).locator('.field-node').filter({ hasText: /^Media/ }).first();
      const mediaChildrenVisible = await qb(page)
        .locator('.field-node')
        .filter({ hasText: /^bannerImage/ })
        .first()
        .isVisible();
      if (!mediaChildrenVisible) {
        await mediaField.click();
      }

      const mediaCheckbox = mediaField.locator('.field-checkbox');
      if (!(await mediaCheckbox.isChecked())) {
        await mediaCheckbox.check();
      }

      const fieldsSection = qb(page).locator('.query-builder-tree');
      for (const fieldName of ['id\\b', 'description', 'bannerImage']) {
        const field = fieldsSection.locator('.field-node').filter({ hasText: new RegExp(`^${fieldName}`) }).first();
        const checkbox = field.locator('.field-checkbox');
        if (!(await checkbox.isChecked())) {
          await checkbox.check();
        }
      }

      await expect.poll(() => getQueryEditorContent(page)).toContain('bannerImage');
      // Wait for the Tree→Editor generation debounce (150ms) to complete
      await page.waitForTimeout(200);
    });

    await test.step('Remove "bannerImage" field from the code editor', async () => {
      const content = await getQueryEditorContent(page);
      const updatedContent = content
        .split('\n')
        .filter((line: string) => !line.trim().startsWith('bannerImage'))
        .join('\n');

      // Set content directly via CodeMirror
      const editor = page.locator('[aria-label="Query Editor"] .CodeMirror').first();
      await editor.evaluate((el, val) => {
        const cm = (el as any).CodeMirror;
        if (cm) cm.setValue(val);
      }, updatedContent);
    });

    await test.step('Verify "bannerImage" checkbox is unchecked in query builder', async () => {
      const fieldsSection = qb(page).locator('.query-builder-tree');
      const bannerCheckbox = fieldsSection
        .locator('.field-node')
        .filter({ hasText: /^bannerImage/ })
        .first()
        .locator('.field-checkbox');
      await expect(bannerCheckbox).not.toBeChecked();
    });

    await test.step('Verify "id" and "description" are still checked', async () => {
      const fieldsSection = qb(page).locator('.query-builder-tree');

      const idCheckbox = fieldsSection.locator('.field-node').filter({ hasText: /^id\b/ }).first().locator('.field-checkbox');
      await expect(idCheckbox).toBeChecked();

      const descCheckbox = fieldsSection
        .locator('.field-node')
        .filter({ hasText: /^description/ })
        .first()
        .locator('.field-checkbox');
      await expect(descCheckbox).toBeChecked();
    });
  });

  test('Changing variable value in variables editor updates argument in query builder', async ({
    pageWithUserData: page
  }) => {
    await test.step('Set up "Character" field with "id" argument via query builder', async () => {
      const characterField = qb(page).locator('.field-node').filter({ hasText: /^Character/ }).first();
      await characterField.click();
      await expect(qb(page).locator('.section-header').filter({ hasText: 'ARGUMENTS' }).first()).toBeVisible();

      const characterCheckbox = characterField.locator('.field-checkbox');
      if (!(await characterCheckbox.isChecked())) {
        await characterCheckbox.check();
      }

      const argRow = qb(page).locator('.arg-row').filter({ has: page.locator('.arg-name', { hasText: /^id$/ }) }).first();
      const argCheckbox = argRow.locator('.field-checkbox');
      if (!(await argCheckbox.isChecked())) {
        await argCheckbox.check();
      }
      const argInput = argRow.locator('input[type="text"]');
      await argInput.fill('100');

      const genderField = qb(page).locator('.field-node').filter({ hasText: /^gender/ }).first();
      const genderCheckbox = genderField.locator('.field-checkbox');
      if (!(await genderCheckbox.isChecked())) {
        await genderCheckbox.check();
      }

      await expect.poll(() => getQueryEditorContent(page)).toContain('$id');
      await expect.poll(() => getVariablesEditorContent(page)).toContain('100');
    });

    await test.step('Change the variable value in the variables editor', async () => {
      const variablesContent = await getVariablesEditorContent(page);
      const updatedVariables = variablesContent.replace('100', '999');

      // Set content directly via CodeMirror
      await ensureVariablesPaneOpen(page);
      const editor = page.locator('.variables-section .CodeMirror').first();
      await editor.evaluate((el, val) => {
        const cm = (el as any).CodeMirror;
        if (cm) cm.setValue(val);
      }, updatedVariables);
    });

    await test.step('Verify the argument value is updated in query builder', async () => {
      const argRow = qb(page).locator('.arg-row').filter({ has: page.locator('.arg-name', { hasText: /^id$/ }) }).first();
      const argInput = argRow.locator('input[type="text"]');
      await expect(argInput).toHaveValue('999');
    });
  });
});
