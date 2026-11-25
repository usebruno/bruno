import { Page } from '../../playwright';

/**
 * Collection app editor. The "Migrate to YML" pill, modal and drafts step live in migrate-to-yml.ts.
 */
export const buildCollectionAppLocators = (page: Page) => {
  const activeAppSlot = () => page.getByTestId('app-preview-slot').filter({ visible: true });

  return {
    emptyStateAddCodeButton: () => activeAppSlot().getByTestId('empty-app-state').getByTestId('empty-app-add-code'),
    codeView: () => activeAppSlot().getByTestId('collection-app-code'),
    codeEditor: () => activeAppSlot().getByTestId('collection-app-code-editor').locator('.CodeMirror'),
    viewToggle: (view: 'code' | 'preview') => activeAppSlot().getByTestId(`collection-app-view-${view}`)
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
