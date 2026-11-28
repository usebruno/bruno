import { test, expect } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  openCollectionSettings,
  selectCollectionPaneTab,
  selectCollectionScriptPaneTab,
  setCodeEditorContent,
  setCodeEditorCursor,
  focusCodeEditor,
  getCodeEditorValueAndCursor
} from '../utils/page';

test.setTimeout(60000);

for (const phase of ['pre-request', 'post-response'] as const) {
  test(`Collection ${phase} script keeps its cursor when switching collections`, async ({ page, createTmpDir }) => {
    const editorId = `collection-${phase}-script-editor`;
    const script = 'const first = 1;\nconst second = 2;\nconst third = 3;';
    const cursorA = { line: 1, ch: 6 };
    const cursorB = { line: 2, ch: 3 };
    const collectionA = `cursor-a-${phase}`;
    const collectionB = `cursor-b-${phase}`;

    try {
      const location = await createTmpDir(`collection-cursor-${phase}`);
      await createCollection(page, collectionA, location);
      await selectCollectionPaneTab(page, 'script');
      await selectCollectionScriptPaneTab(page, phase);
      await setCodeEditorContent(page, editorId, script);
      await setCodeEditorCursor(page, editorId, cursorA);

      await selectCollectionPaneTab(page, 'overview');
      await selectCollectionPaneTab(page, 'script');
      await expect.poll(async () => (await getCodeEditorValueAndCursor(page, editorId)).cursor).toEqual(cursorA);

      await createCollection(page, collectionB, location);
      await selectCollectionPaneTab(page, 'script');
      await selectCollectionScriptPaneTab(page, phase);
      await setCodeEditorContent(page, editorId, script);
      await setCodeEditorCursor(page, editorId, cursorB);

      await openCollectionSettings(page, collectionA);
      await selectCollectionPaneTab(page, 'script');
      await selectCollectionScriptPaneTab(page, phase);
      await expect.poll(async () => (await getCodeEditorValueAndCursor(page, editorId)).cursor).toEqual(cursorA);

      await focusCodeEditor(page, editorId);
      await page.keyboard.insertText('restored');
      const lines = script.split('\n');
      lines[cursorA.line] = `${lines[cursorA.line].slice(0, cursorA.ch)}restored${lines[cursorA.line].slice(cursorA.ch)}`;
      await expect.poll(async () => (await getCodeEditorValueAndCursor(page, editorId)).value).toBe(lines.join('\n'));

      await openCollectionSettings(page, collectionB);
      await selectCollectionPaneTab(page, 'script');
      await selectCollectionScriptPaneTab(page, phase);
      await expect.poll(async () => getCodeEditorValueAndCursor(page, editorId)).toMatchObject({ value: script, cursor: cursorB });
    } finally {
      await closeAllCollections(page);
    }
  });
}
