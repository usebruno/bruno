import { test, expect, Page, Locator } from '../..';
import { buildEnvironmentLocators } from './environment';
import { type EnvironmentType } from './selector';
import { openEnvironmentInSettings, saveEnvironment } from './settings';
import { buildDataTypeSelectorLocators } from '../shared-ui/data-type-selector';

const buildLocators = (page: Page) => ({
  environment: buildEnvironmentLocators(page),
  dataTypeSelector: buildDataTypeSelectorLocators(page)
});

export type EnvironmentVariable = {
  name: string;
  value: string;
  isSecret?: boolean;
  dataType?: 'number' | 'boolean' | 'object';
};

/**
 * Add an environment variable to the currently open environment. Variables and
 * secrets live on separate tabs, so a secret is routed to the Secrets tab and a
 * plain variable to the Variables tab before the row is added.
 * @param page - The page object
 * @param variable - The variable to add (name, value, and optional secret flag)
 * @param options - `valueFirst` types the value into the row before naming it
 * @returns void
 */
export const addEnvironmentVariable = async (
  page: Page,
  variable: EnvironmentVariable,
  options: AddRowOptions = {}
) => {
  await test.step(`Add environment ${variable.isSecret ? 'secret' : 'variable'} "${variable.name}"`, async () => {
    const tab = variable.isSecret
      ? page.getByTestId('responsive-tab-secrets')
      : page.getByTestId('responsive-tab-variables');
    await tab.click();
    await expect(tab).toHaveClass(/active/);

    await addRowToActiveTab(page, variable.name, variable.value, variable.dataType, options);
  });
};

/**
 * Add multiple environment variables to the currently open environment. Each entry
 * is routed to the Variables or Secrets tab based on its `isSecret` flag.
 * @param page - The page object
 * @param variables - Array of variables to add
 * @returns void
 */
export const addEnvironmentVariables = async (page: Page, variables: EnvironmentVariable[]) => {
  await test.step(`Add ${variables.length} environment variables`, async () => {
    for (let i = 0; i < variables.length; i++) {
      await addEnvironmentVariable(page, variables[i]);
    }
  });
};

export type AddRowOptions = { valueFirst?: boolean };

/**
 * Bring part of the environment table into view. The table is virtualized, so a row outside the
 * rendered window is absent from the DOM altogether, and waiting on the target alone never
 * resolves. Walks the scroller a viewport at a time until the target renders, leaving the list
 * wherever that happened.
 * @param page - The page object
 * @param target - The row, or a control within a row, to scroll to
 * @returns void
 */
export const scrollEnvironmentTableTo = async (page: Page, target: Locator) => {
  const isRendered = () => target.isVisible().catch(() => false);
  if (await isRendered()) {
    return;
  }

  const scroller = buildLocators(page).environment.variablesScroller();
  await scroller.waitFor({ state: 'visible' });

  const viewports = await scroller.evaluate((element) => Math.ceil(element.scrollHeight / element.clientHeight));
  for (let viewport = 0; viewport <= viewports; viewport++) {
    await scroller.evaluate((element, offset) => element.scrollTo({ top: offset * element.clientHeight }), viewport);
    if (await isRendered()) {
      return;
    }
  }
};

/**
 * The trailing empty row's Name input, scrolled into the rendered window first. Only the empty
 * row carries the `Name` placeholder, so a match is always the row a new variable goes into.
 * @param page - The page object
 * @returns The empty row's Name input
 */
export const emptyRowNameInput = async (page: Page) => {
  const nameInput = page.locator('input[placeholder="Name"]').last();

  await scrollEnvironmentTableTo(page, nameInput);
  await nameInput.waitFor({ state: 'visible' });

  return nameInput;
};

/**
 * Add a variable or secret to whichever environment tab (Variables / Secrets) is
 * currently active. The active tab determines the row's type, so select the tab
 * before calling. When `dataType` is given, its type is set via the DataTypeSelector.
 * @param page - The page object
 * @param name - The variable/secret name
 * @param value - The variable/secret value
 * @param dataType - Optional non-string dataType to assign (default `string`)
 * @param options - `valueFirst` types the value into the row before naming it
 * @returns void
 */
export const addRowToActiveTab = async (
  page: Page,
  name: string,
  value: string,
  dataType?: 'number' | 'boolean' | 'object',
  options: AddRowOptions = {}
) => {
  await test.step(`Add row "${name}" to the active environment tab`, async () => {
    const { environment, dataTypeSelector } = buildLocators(page);

    if (options.valueFirst) {
      const nameInput = await emptyRowNameInput(page);
      // Filling the value appends another empty row, so the row being filled in stops being the
      // last one — its formik index is what stays put until it has a name to be found by.
      const formikName = await nameInput.getAttribute('name');
      if (formikName === null) {
        throw new Error('Empty environment row is missing its formik "name" attribute');
      }
      const rowIndex = Number(formikName.split('.')[0]);

      const emptyRowEditor = environment.variableValueEditor(rowIndex);
      await emptyRowEditor.scrollIntoViewIfNeeded();
      await emptyRowEditor.click({ position: { x: 5, y: 5 } });
      await expect(emptyRowEditor).toHaveClass(/CodeMirror-focused/);
      await page.keyboard.type(value);
      await expect(emptyRowEditor).toContainText(value);

      await environment.variableNameInput(rowIndex).fill(name);
    } else {
      const nameInput = await emptyRowNameInput(page);
      await nameInput.fill(name);
    }

    const row = page.getByTestId(`env-var-row-${name}`);
    await row.waitFor({ state: 'visible' });

    const codeMirror = row.getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror').first();
    await codeMirror.scrollIntoViewIfNeeded();
    if (!options.valueFirst) {
      // Target the editor's left edge: when the value column is narrow the DataTypeSelector
      // renders as a compact overlay pinned to the cell's right side, which otherwise
      // intercepts a centered click/hover.
      await codeMirror.click({ position: { x: 5, y: 5 } });
      if (dataType) {
        await expect(codeMirror).toHaveClass(/CodeMirror-focused/);
        await page.keyboard.insertText(value);
      } else {
        await page.keyboard.type(value);
      }
    }

    if (dataType) {
      await codeMirror.hover({ position: { x: 5, y: 5 } });
      await dataTypeSelector.typeLabel(row).click();
      await dataTypeSelector.menuItem(dataType).click();
      await expect(dataTypeSelector.typeLabel(row)).toHaveAttribute('data-selected-type', dataType);
    }
  });
};

/**
 * Replace the value of an existing environment variable row. The row must already be on the
 * active tab; a secret keeps its value masked, so reveal it with the row's eye toggle
 * before asserting on the displayed text. Whatever the row holds is cleared first, so the
 * same call can be repeated against an app instance a previous test already wrote to.
 * @param page - The page object
 * @param name - The name of the row to fill
 * @param value - The value to type
 * @returns void
 */
export const setEnvironmentVariableValue = async (page: Page, name: string, value: string) => {
  await test.step(`Set environment variable "${name}" to "${value}"`, async () => {
    const editor = buildLocators(page).environment.varRowValueEditor(name);
    await scrollEnvironmentTableTo(page, editor);
    await editor.scrollIntoViewIfNeeded();
    await editor.click({ position: { x: 5, y: 5 } });
    await expect(editor).toHaveClass(/CodeMirror-focused/);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(value);
    await expect(editor).not.toHaveClass(/CodeMirror-empty/);
  });
};

/**
 * Uncheck the enabled checkbox of an environment variable row. The row must already be on the
 * active tab.
 * @param page - The page object
 * @param name - The name of the row to disable
 * @returns void
 */
export const disableEnvironmentVariable = async (page: Page, name: string) => {
  await test.step(`Disable environment variable "${name}"`, async () => {
    const checkbox = buildLocators(page).environment.varRowEnabledCheckbox(name);
    await scrollEnvironmentTableTo(page, checkbox);
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
  });
};

/**
 * Give an environment's secret rows their values and save. A secret's value never lives in the
 * environment file, so a fixture can only declare the rows — a test that needs a secret
 * resolved has to type the values in through the editor first.
 * @param page - The page object
 * @param environmentName - The environment holding the secret rows
 * @param secrets - Secret name to value
 * @param type - The environment scope the settings tab is showing
 * @returns void
 */
export const setEnvironmentSecrets = async (
  page: Page,
  environmentName: string,
  secrets: Record<string, string>,
  type: EnvironmentType = 'collection'
) => {
  await test.step(`Set the secrets of environment "${environmentName}"`, async () => {
    const { environment } = buildLocators(page);

    await openEnvironmentInSettings(page, environmentName, type);
    await environment.secretsTab().click();

    for (const [name, value] of Object.entries(secrets)) {
      await setEnvironmentVariableValue(page, name, value);
    }

    await saveEnvironment(page);
    await environment.variablesTab().click();
  });
};

/**
 * Filter the open environment's rows through the editor's search box, opening it first
 * when it is still collapsed behind the search icon.
 * @param page - The page object
 * @param query - The text to filter by
 * @returns void
 */
export const searchEnvironmentVariables = async (page: Page, query: string) => {
  await test.step(`Filter environment variables by "${query}"`, async () => {
    const { environment } = buildLocators(page);
    if (!(await environment.searchInput().isVisible())) {
      await environment.searchAction().click();
    }
    await environment.searchInput().fill(query);
  });
};

// Clicks the sort toggle once: default -> asc -> desc -> default.
export const cycleVariableSort = async (page: Page) => {
  await test.step('Cycle variable sort mode', async () => {
    await buildLocators(page).environment.sortToggle().click();
  });
};

// Displayed variable names, top to bottom, excluding the trailing empty row.
export const getVisibleVariableNames = async (page: Page): Promise<string[]> => {
  const values = await buildLocators(page)
    .environment.visibleNameInputs()
    .evaluateAll((inputs) => inputs.map((el) => (el as HTMLInputElement).value));
  return values.filter((name) => name !== '');
};

// Drags row `fromName` onto row `toName` (Manual sort mode only).
export const dragVariableRow = async (page: Page, fromName: string, toName: string) => {
  await test.step(`Drag variable row "${fromName}" onto "${toName}"`, async () => {
    const common = buildLocators(page);
    await common.environment.varRow(fromName).hover();
    await common.environment.dragHandle(fromName).dragTo(common.environment.varRow(toName), {
      targetPosition: { x: 5, y: 5 },
      force: true
    });
  });
};

/**
 * Read the rendered widths of the resizable columns in the environment variables table.
 * Waits until the table reports its column widths as measured.
 * @param page - The page object
 * @returns Width in px of the Name, Value and Description columns
 */
export const getEnvironmentColumnWidths = async (page: Page) => {
  const { environment } = buildLocators(page);
  const columns = ['name', 'value', 'description'] as const;

  await expect(environment.variablesTable()).toHaveAttribute('data-columns-measured', 'true');

  const [name, value, description] = await Promise.all(
    columns.map(async (column) => (await environment.columnHeader(column).boundingBox())?.width ?? 0)
  );
  return { name, value, description };
};

/**
 * Drag a column divider in the environment variables table horizontally.
 * @param page - The page object
 * @param column - The column whose right-edge divider is dragged ('name' or 'value')
 * @param deltaX - Horizontal distance in px; positive widens the column
 * @returns void
 */
export const dragEnvironmentColumnDivider = async (page: Page, column: 'name' | 'value', deltaX: number) => {
  await test.step(`Drag the ${column} column divider by ${deltaX}px`, async () => {
    const handle = buildLocators(page).environment.columnResizeHandle(column);
    await handle.hover();

    const box = await handle.boundingBox();
    if (!box) throw new Error(`Resize handle for the ${column} column is not rendered`);

    // Grab near the top so the pointer stays within the header row
    const startX = box.x + box.width / 2;
    const startY = box.y + 10;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY, { steps: 10 });
    await page.mouse.up();
  });
};
