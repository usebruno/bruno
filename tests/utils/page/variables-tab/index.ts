import { Locator, Page, test } from '../../../../playwright';
import { switchToOpenTab } from '../actions';
import { waitForPredicate } from '../../wait';

export type VariablesSection = 'runtime' | 'environment';

// The environment section's testids are built from `env`, not the section name.
const TESTID_SEGMENT: Record<VariablesSection, string> = {
  runtime: 'runtime',
  environment: 'env'
};

/**
 * How the value editor classifies a token. A cell's text alone can't tell a number
 * from a numeric string, since both read as `25` once the quotes are stripped, so
 * the type assertions go through the class CodeMirror puts on the token instead.
 * `variable` is Bruno's own token for a resolvable `{{name}}` reference.
 */
export type ValueTokenType = 'string' | 'number' | 'boolean' | 'property' | 'variable';

const TOKEN_CLASS: Record<ValueTokenType, string> = {
  string: 'cm-string',
  number: 'cm-number',
  boolean: 'cm-atom',
  property: 'cm-property',
  variable: 'cm-variable-valid'
};

const ANY_TOKEN_SELECTOR = Object.values(TOKEN_CLASS).map((cls) => `.${cls}`).join(', ');

export const buildVariablesTabLocators = (page: Page) => {
  const sectionHeader = (section: VariablesSection) =>
    page.getByTestId(`variables-${TESTID_SEGMENT[section]}-section`);
  const table = (section: VariablesSection) =>
    page.getByTestId(`variables-${TESTID_SEGMENT[section]}-table`);
  const row = (section: VariablesSection, name: string) =>
    table(section).locator(`tbody tr[data-row-name="${name}"]`);
  const drawer = () => page.getByTestId('variable-details-drawer');

  return {
    editor: () => page.getByTestId('variables-editor'),
    // Both sections share one scroller, so the scroll position is a tab-level value.
    scroller: () => page.getByTestId('variables-scroll-container'),
    sectionHeader,
    sectionCount: (section: VariablesSection) =>
      sectionHeader(section).getByTestId('variables-section-count'),
    sectionSubtitle: (section: VariablesSection) =>
      sectionHeader(section).getByTestId('variables-section-subtitle'),
    sectionSortToggle: (section: VariablesSection) =>
      page.getByTestId(`variables-${TESTID_SEGMENT[section]}-table-sort-toggle`),
    emptyMessage: (message: string) => page.getByTestId('variables-editor').getByText(message),

    table,
    rows: (section: VariablesSection) => table(section).locator('tbody tr'),
    row,
    rowEditor: (section: VariablesSection, name: string) =>
      row(section, name).locator('.CodeMirror').first(),
    rowSingleLineEditor: (section: VariablesSection, name: string) =>
      row(section, name).getByTestId('variable-singleline-editor'),
    rowMultiLineEditor: (section: VariablesSection, name: string) =>
      row(section, name).getByTestId('variable-multiline-editor'),
    rowCopyButton: (section: VariablesSection, name: string) =>
      row(section, name).getByTestId('variable-row-copy'),
    rowSecretToggle: (section: VariablesSection, name: string) =>
      row(section, name).getByTestId('variable-row-secret-toggle'),
    rowObjectPreview: (section: VariablesSection, name: string) =>
      row(section, name).getByTestId('variable-object-preview'),
    // The first token of the given type in a value cell.
    valueToken: (section: VariablesSection, name: string, tokenType: ValueTokenType) =>
      row(section, name).locator(`.${TOKEN_CLASS[tokenType]}`).first(),
    // Every classified token in a value cell — empty when the editor is in plain-text mode.
    valueTokens: (section: VariablesSection, name: string) =>
      row(section, name).locator(ANY_TOKEN_SELECTOR),
    // The `↤N↦` widget a collapsed block leaves behind, N being the hidden key count.
    foldMarkers: (cmEditor: Locator) => cmEditor.locator('.CodeMirror-foldmarker'),

    drawer,
    drawerName: () => drawer().getByTestId('variable-details-name'),
    drawerSection: () => drawer().getByTestId('variable-details-section'),
    drawerEditor: () => drawer().locator('.CodeMirror').first(),
    drawerClose: () => drawer().getByTestId('variable-details-close')
  };
};

/**
 * Open the Variables tab for `collectionName`. The collection header is bound to
 * the active tab's collection, so the collection is focused first. Only one
 * Variables tab exists per collection — reopening focuses the existing one.
 */
export const openVariablesTab = async (page: Page, collectionName: string) => {
  await test.step(`Open the Variables tab for "${collectionName}"`, async () => {
    await page.getByTestId('sidebar-collection-row').filter({ hasText: collectionName }).click();
    await page.getByTestId('more-actions').click();
    await page.getByTestId('more-actions-variables').click();
    await buildVariablesTabLocators(page).editor().waitFor({ state: 'visible' });
  });
};

// A row's copy / reveal / drawer buttons are `pointer-events: none` until the row
// is hovered, so every row action hovers the row first.

export const copyVariableValue = async (page: Page, section: VariablesSection, name: string) => {
  await test.step(`Copy the value of "${name}"`, async () => {
    const { row, rowCopyButton } = buildVariablesTabLocators(page);
    await row(section, name).hover();
    await rowCopyButton(section, name).click();
  });
};

export const toggleSecretReveal = async (page: Page, section: VariablesSection, name: string) => {
  await test.step(`Toggle the secret reveal for "${name}"`, async () => {
    const { row, rowSecretToggle } = buildVariablesTabLocators(page);
    await row(section, name).hover();
    await rowSecretToggle(section, name).click();
  });
};

export const openVariableDrawer = async (page: Page, section: VariablesSection, name: string) => {
  await test.step(`Open "${name}" in the details drawer`, async () => {
    const { row, rowObjectPreview } = buildVariablesTabLocators(page);
    await row(section, name).hover();
    await rowObjectPreview(section, name).click();
  });
};

/**
 * Leave the Variables tab and come back. Persisted view state (reveal, accordion,
 * drawer selection, folds, scroll) is keyed on the tab uid, so this round trip is
 * what proves the state survives the remount.
 */
export const reopenVariablesTab = async (page: Page, viaTabLabel: string) => {
  await test.step('Switch away from the Variables tab and back', async () => {
    const { editor } = buildVariablesTabLocators(page);
    await switchToOpenTab(page, viaTabLabel);
    await editor().waitFor({ state: 'detached' });
    await switchToOpenTab(page, 'Variables');
    await editor().waitFor({ state: 'visible' });
  });
};

/** Names of the rows currently rendered in a section, top to bottom. */
export const getVariableRowNames = async (page: Page, section: VariablesSection): Promise<string[]> => {
  const names = await buildVariablesTabLocators(page)
    .rows(section)
    .evaluateAll((rows) => rows.map((el) => el.getAttribute('data-row-name')));
  return names.filter((name): name is string => !!name);
};

/**
 * The text of a value cell. CodeMirror pads an otherwise-empty line with a
 * zero-width space, so strip it before comparing.
 */
export const readVariableValue = async (
  page: Page,
  section: VariablesSection,
  name: string
): Promise<string> => {
  const lines = await buildVariablesTabLocators(page)
    .row(section, name)
    .locator('.CodeMirror-line')
    .allInnerTexts();
  return lines.join('\n').replace(/\u200b/g, '').trim();
};

/** How far the shared section scroller is scrolled. */
export const getVariablesScrollTop = (page: Page): Promise<number> =>
  buildVariablesTabLocators(page).scroller().evaluate((el) => el.scrollTop);

/** How far it *can* scroll — zero when the list doesn't overflow. */
export const getVariablesScrollRange = (page: Page): Promise<number> =>
  buildVariablesTabLocators(page).scroller().evaluate((el) => el.scrollHeight - el.clientHeight);

/**
 * Scroll the shared section scroller to `top`. On mount the editor briefly forces
 * the position back while TableVirtuoso settles, so keep setting it until it holds.
 */
export const scrollVariablesTo = async (page: Page, top: number) => {
  await test.step(`Scroll the variables list to ${top}px`, async () => {
    const scroller = buildVariablesTabLocators(page).scroller();
    await waitForPredicate(async () => {
      await scroller.evaluate((el, y) => { el.scrollTop = y; }, top);
      return (await scroller.evaluate((el) => el.scrollTop)) === top;
    });
  });
};

/**
 * An object cell's editor is height-capped and scrolls on its own, so its scroll
 * position is separate from the section scroller's. Go through CodeMirror's API —
 * the scrollable element is one of its internals, not the `.CodeMirror` wrapper.
 */
export const getValueEditorScrollTop = (cmEditor: Locator): Promise<number> =>
  cmEditor.evaluate((el) => (el as any).CodeMirror.getScrollInfo().top);

/** How far the editor *can* scroll — zero when the value fits inside the cap. */
export const getValueEditorScrollRange = (cmEditor: Locator): Promise<number> =>
  cmEditor.evaluate((el) => {
    const { height, clientHeight } = (el as any).CodeMirror.getScrollInfo();
    return height - clientHeight;
  });

export const scrollValueEditorTo = async (cmEditor: Locator, top: number) => {
  await test.step(`Scroll the value editor to ${top}px`, async () => {
    await cmEditor.evaluate((el, y) => (el as any).CodeMirror.scrollTo(null, y), top);
  });
};

/**
 * Collapse the object by clicking the fold gutter's arrow, which is how a user
 * folds it. The outermost object opens on the first line, so it owns the first
 * marker CodeMirror renders.
 */
export const foldObjectLine = async (cmEditor: Locator) => {
  await cmEditor.locator('.CodeMirror-foldgutter-open').first().click();
};

export const unfoldObjectLine = async (cmEditor: Locator) => {
  await cmEditor.locator('.CodeMirror-foldgutter-folded').first().click();
};
