import { Page } from '../../../../playwright';

/**
 * Collection app UI: the "Add app code" empty state and Code view, plus the
 * "Migrate to YML" pill, the migrate modal's title and collection name, and the
 * "Unsaved changes" drafts step shown when an unsaved app edit blocks the migration.
 */
export const buildCollectionAppLocators = (page: Page) => {
  const migrateModal = () => page.getByRole('dialog').filter({ hasText: 'Migrate to YML format' });
  const draftsStep = () => page.getByTestId('migration-drafts-step');
  const activeAppSlot = () => page.locator('.app-preview-slot.active');

  return {
    modal: migrateModal,
    modalTitle: () => migrateModal().getByText('Migrate to YML format', { exact: true }),
    modalCollectionName: (collectionName: string) => migrateModal().getByText(collectionName, { exact: true }),
    pill: () => page.getByTestId('migrate-yml-pill'),
    emptyStateAddCodeButton: () => activeAppSlot().getByTestId('empty-app-state').getByTestId('empty-app-add-code'),
    codeView: () => activeAppSlot().getByTestId('collection-app-code'),
    codeEditor: () => activeAppSlot().getByTestId('collection-app-code').locator('.CodeMirror').first(),
    viewToggle: (view: 'code' | 'preview') => activeAppSlot().getByTestId(`collection-app-view-${view}`),
    draftsStep,
    draftsTitle: () => draftsStep().getByText('Hold on..'),
    draftsSummary: () => draftsStep().getByText(/^You have unsaved changes in/),
    draftsItem: (label: string) => draftsStep().getByText(`• ${label}`, { exact: true })
  };
};

/**
 * Click "Add app code" on an empty collection app and wait for its Code view.
 * @param page - The page object
 */
export const addCollectionAppCodeFromEmptyState = async (page: Page) => {
  const collectionApp = buildCollectionAppLocators(page);
  await collectionApp.emptyStateAddCodeButton().click();
  await collectionApp.codeView().waitFor({ state: 'visible' });
};

/**
 * Opens the migration modal from the "Migrate to YML" pill in the collection header.
 * @param page - The page object
 */
export const openMigrateToYmlModalFromPill = async (page: Page) => {
  const collectionApp = buildCollectionAppLocators(page);
  await collectionApp.pill().click();
  await collectionApp.modal().waitFor({ state: 'visible', timeout: 5000 });
};

/**
 * Sets the code of the active collection app. Uses the CodeMirror API instead of
 * typing, since typing HTML/JS triggers auto-close-brackets. Does not save.
 * @param page - The page object
 * @param code - The app code to set
 */
export const setCollectionAppCode = async (page: Page, code: string) => {
  const collectionApp = buildCollectionAppLocators(page);
  await collectionApp.viewToggle('code').click();
  const editor = collectionApp.codeEditor();
  await editor.waitFor({ state: 'visible' });
  await editor.evaluate((el, val) => {
    const cm = (el as any).CodeMirror;
    if (cm) cm.setValue(val);
  }, code);
};
