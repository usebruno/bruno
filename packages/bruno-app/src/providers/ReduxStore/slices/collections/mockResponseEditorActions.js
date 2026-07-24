import { collectionsSlice } from './index';

export const {
  initMockResponseEditor,
  syncMockResponseEditorSaved,
  updateMockResponseRules,
  cancelMockResponseEditorEdit,
  removeMockResponseEditor
} = collectionsSlice.actions;
