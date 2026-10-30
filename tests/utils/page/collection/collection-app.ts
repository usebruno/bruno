import { Page } from '../../../../playwright';

/**
 * Collection app editor, plus the "Migrate to YML" pill and modal it blocks with unsaved edits.
 */
export const buildCollectionAppLocators = (page: Page) => {
  const migrateModal = () => page.getByTestId('migrate-to-yml-modal');
  const draftsStep = () => page.getByTestId('migration-drafts-step');
  const activeAppSlot = () => page.getByTestId('app-preview-slot-active');

  return {
    modal: migrateModal,
    modalTitle: () => migrateModal().getByTestId('migrate-to-yml-modal-title'),
    modalCollectionName: () => migrateModal().getByTestId('migrate-to-yml-collection-name'),
    pill: () => page.getByTestId('migrate-yml-pill'),
    emptyStateAddCodeButton: () => activeAppSlot().getByTestId('empty-app-state').getByTestId('empty-app-add-code'),
    codeView: () => activeAppSlot().getByTestId('collection-app-code'),
    codeEditor: () => activeAppSlot().getByTestId('collection-app-code-editor').locator('.CodeMirror'),
    viewToggle: (view: 'code' | 'preview') => activeAppSlot().getByTestId(`collection-app-view-${view}`),
    draftsStep,
    draftsTitle: () => draftsStep().getByTestId('migration-drafts-title'),
    draftsSummary: () => draftsStep().getByTestId('migration-drafts-summary'),
    draftsItems: () => draftsStep().getByTestId('migration-drafts-item')
  };
};

/**
 * Click "Add app code" on an empty collection app and wait for its Code view.
 */
export const addCollectionAppCodeFromEmptyState = async (page: Page) => {
  const collectionApp = buildCollectionAppLocators(page);
  await collectionApp.emptyStateAddCodeButton().click();
  await collectionApp.codeView().waitFor({ state: 'visible' });
};

/**
 * Opens the migration modal from the "Migrate to YML" pill in the collection header.
 */
export const openMigrateToYmlModalFromPill = async (page: Page) => {
  const collectionApp = buildCollectionAppLocators(page);
  await collectionApp.pill().click();
  await collectionApp.modal().waitFor({ state: 'visible', timeout: 5000 });
};

/**
 * Sets the active app's code without saving.
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
