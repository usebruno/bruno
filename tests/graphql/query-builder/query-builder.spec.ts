import { test, expect, Page } from '../../../playwright';
import { closeAllCollections, openRequest } from '../../utils/page';

const qb = (page: Page) => page.locator('.graphql-query-builder-container');

const getQueryEditorContent = async (page: Page) => {
  const editor = page.locator('[aria-label="Query Editor"] .CodeMirror').first();
  await expect(editor).toBeVisible();
  return await editor.evaluate((el) => (el as any).CodeMirror?.getValue() || '');
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
  return await editor.evaluate((el) => (el as any).CodeMirror?.getValue() || '');
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
      await expect(page.getByText('GraphQL Schema loaded successfully').first()).toBeVisible();

      await expect(qb(page).locator('.query-builder-tree')).toBeVisible();
    });

    await test.step('Click on "users" field to expand it', async () => {
      const usersField = qb(page).locator('.field-node').filter({ hasText: /^users/ }).first();
      await usersField.click();
      await expect(qb(page).locator('.section-header').filter({ hasText: 'ARGUMENTS' }).first()).toBeVisible();
    });

    await test.step('Check the "users" field checkbox', async () => {
      const usersCheckbox = qb(page).locator('.field-node').filter({ hasText: /^users/ }).first().locator('.field-checkbox');
      await usersCheckbox.check();
      await expect(usersCheckbox).toBeChecked();
    });

    await test.step('Check child fields: id, name, email', async () => {
      const fieldsSection = qb(page).locator('.query-builder-tree');

      const idField = fieldsSection.locator('.field-node').filter({ hasText: /^id/ }).first();
      await idField.locator('.field-checkbox').check();

      const nameField = fieldsSection.locator('.field-node').filter({ hasText: /^name/ }).first();
      await nameField.locator('.field-checkbox').check();

      const emailField = fieldsSection.locator('.field-node').filter({ hasText: /^email/ }).first();
      await emailField.locator('.field-checkbox').check();
    });

    await test.step('Verify query is generated in the editor', async () => {
      // Poll to allow the 150ms debounce to fire
      await expect.poll(() => getQueryEditorContent(page)).toContain('id');
      const editorContent = await getQueryEditorContent(page);
      expect(editorContent).toContain('id');
      expect(editorContent).toContain('name');
      expect(editorContent).toContain('email');
    });
  });

  test('Enable argument and set value', async ({ pageWithUserData: page }) => {
    await test.step('Expand "user" field to show arguments', async () => {
      const userField = qb(page).locator('.field-node').filter({ hasText: /^user\b/ }).first();
      await userField.click();
      await expect(qb(page).locator('.section-header').filter({ hasText: 'ARGUMENTS' }).first()).toBeVisible();
    });

    await test.step('Check the "user" field', async () => {
      const userCheckbox = qb(page).locator('.field-node').filter({ hasText: /^user\b/ }).first().locator('.field-checkbox');
      await userCheckbox.check();
    });

    await test.step('Enable the "id" argument and set a value', async () => {
      const argRow = qb(page).locator('.arg-row').filter({ hasText: /^id/ }).first();
      const argCheckbox = argRow.locator('.field-checkbox');
      await argCheckbox.check();
      await expect(argCheckbox).toBeChecked();

      const argInput = argRow.locator('input[type="text"]');
      await expect(argInput).toBeVisible();
      await argInput.fill('123');
    });

    await test.step('Check child field "name"', async () => {
      const nameField = qb(page).locator('.field-node').filter({ hasText: /^name/ }).first();
      await nameField.locator('.field-checkbox').check();
    });

    await test.step('Verify generated query contains the argument', async () => {
      await expect.poll(() => getQueryEditorContent(page)).toContain('$id');
      const editorContent = await getQueryEditorContent(page);
      expect(editorContent).toContain('name');
      expect(editorContent).toContain('$id');
    });

    await test.step('Verify variables pane contains the argument value', async () => {
      const variablesContent = await getVariablesEditorContent(page);
      expect(variablesContent).toContain('"id"');
      expect(variablesContent).toContain('"123"');
    });
  });

  test('Expand nested object types', async ({ pageWithUserData: page }) => {
    await test.step('Expand "post" field', async () => {
      const postField = qb(page).locator('.field-node').filter({ hasText: /^post/ }).first();
      await postField.click();
    });

    await test.step('Check "post" and expand "author" nested field', async () => {
      const postCheckbox = qb(page).locator('.field-node').filter({ hasText: /^post/ }).first().locator('.field-checkbox');
      await postCheckbox.check();

      const titleField = qb(page).locator('.field-node').filter({ hasText: /^title/ }).first();
      await titleField.locator('.field-checkbox').check();

      const authorField = qb(page).locator('.field-node').filter({ hasText: /^author/ }).first();
      await authorField.click();
    });

    await test.step('Select nested author fields', async () => {
      const authorCheckbox = qb(page).locator('.field-node').filter({ hasText: /^author/ }).first().locator('.field-checkbox');
      await authorCheckbox.check();

      const nameFields = qb(page).locator('.field-node').filter({ hasText: /^name/ });
      const authorNameField = nameFields.nth(1);
      await authorNameField.locator('.field-checkbox').check();
    });

    await test.step('Verify nested query structure in editor', async () => {
      await expect.poll(() => getQueryEditorContent(page)).toContain('post');
      const editorContent = await getQueryEditorContent(page);
      expect(editorContent).toContain('title');
      expect(editorContent).toContain('author');
      expect(editorContent).toContain('name');
    });
  });

  test('Removing a field in code editor unchecks it in query builder', async ({ pageWithUserData: page }) => {
    await test.step('Ensure "users" is expanded with child fields id, name, email checked', async () => {
      const usersField = qb(page).locator('.field-node').filter({ hasText: /^users/ }).first();
      const usersChildrenVisible = await qb(page).locator('.field-node').filter({ hasText: /^email/ }).first().isVisible();
      if (!usersChildrenVisible) {
        await usersField.click();
      }

      const usersCheckbox = usersField.locator('.field-checkbox');
      if (!(await usersCheckbox.isChecked())) {
        await usersCheckbox.check();
      }

      const fieldsSection = qb(page).locator('.query-builder-tree');
      for (const fieldName of ['id', 'name', 'email']) {
        const field = fieldsSection.locator('.field-node').filter({ hasText: new RegExp(`^${fieldName}`) }).first();
        const checkbox = field.locator('.field-checkbox');
        if (!(await checkbox.isChecked())) {
          await checkbox.check();
        }
      }

      await expect.poll(() => getQueryEditorContent(page)).toContain('email');
      await page.waitForTimeout(200);
    });

    await test.step('Remove "email" field from the code editor', async () => {
      const content = await getQueryEditorContent(page);
      const updatedContent = content
        .split('\n')
        .filter((line: string) => !line.trim().startsWith('email'))
        .join('\n');

      // Set content directly via CodeMirror
      const editor = page.locator('[aria-label="Query Editor"] .CodeMirror').first();
      await editor.evaluate((el, val) => {
        const cm = (el as any).CodeMirror;
        if (cm) cm.setValue(val);
      }, updatedContent);
    });

    await test.step('Verify "email" checkbox is unchecked in query builder', async () => {
      const fieldsSection = qb(page).locator('.query-builder-tree');
      const emailCheckbox = fieldsSection
        .locator('.field-node')
        .filter({ hasText: /^email/ })
        .first()
        .locator('.field-checkbox');
      await expect(emailCheckbox).not.toBeChecked();
    });

    await test.step('Verify "id" and "name" are still checked', async () => {
      const fieldsSection = qb(page).locator('.query-builder-tree');

      const idCheckbox = fieldsSection.locator('.field-node').filter({ hasText: /^id/ }).first().locator('.field-checkbox');
      await expect(idCheckbox).toBeChecked();

      const nameCheckbox = fieldsSection
        .locator('.field-node')
        .filter({ hasText: /^name/ })
        .first()
        .locator('.field-checkbox');
      await expect(nameCheckbox).toBeChecked();
    });
  });

  test('Changing variable value in variables editor updates argument in query builder', async ({
    pageWithUserData: page
  }) => {
    await test.step('Set up "user" field with "id" argument via query builder', async () => {
      const userField = qb(page).locator('.field-node').filter({ hasText: /^user\b/ }).first();
      await expect(qb(page).locator('.section-header').filter({ hasText: 'ARGUMENTS' }).first()).toBeVisible();

      const userCheckbox = userField.locator('.field-checkbox');
      if (!(await userCheckbox.isChecked())) {
        await userCheckbox.check();
      }

      const argRow = qb(page).locator('.arg-row').filter({ hasText: /^id/ }).first();
      const argCheckbox = argRow.locator('.field-checkbox');
      if (!(await argCheckbox.isChecked())) {
        await argCheckbox.check();
      }
      const argInput = argRow.locator('input[type="text"]');
      await argInput.fill('100');

      const nameField = qb(page).locator('.field-node').filter({ hasText: /^name/ }).first();
      const nameCheckbox = nameField.locator('.field-checkbox');
      if (!(await nameCheckbox.isChecked())) {
        await nameCheckbox.check();
      }

      await expect.poll(() => getQueryEditorContent(page)).toContain('$id');
      await expect.poll(() => getVariablesEditorContent(page)).toContain('"100"');
    });

    await test.step('Change the variable value in the variables editor', async () => {
      const variablesContent = await getVariablesEditorContent(page);
      const updatedVariables = variablesContent.replace('"100"', '"999"');

      // Set content directly via CodeMirror
      await ensureVariablesPaneOpen(page);
      const editor = page.locator('.variables-section .CodeMirror').first();
      await editor.evaluate((el, val) => {
        const cm = (el as any).CodeMirror;
        if (cm) cm.setValue(val);
      }, updatedVariables);
    });

    await test.step('Verify the argument value is updated in query builder', async () => {
      const argRow = qb(page).locator('.arg-row').filter({ hasText: /^id/ }).first();
      const argInput = argRow.locator('input[type="text"]');
      await expect(argInput).toHaveValue('999');
    });
  });
});
