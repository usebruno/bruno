import {
  initMockResponseEditor,
  removeMockResponseEditor,
  syncMockResponseEditorSaved,
  updateMockResponseRules,
  cancelMockResponseEditorEdit
} from './mockResponseEditorActions';

describe('mockResponseEditorActions', () => {
  it('exports action creators from the collections slice', () => {
    expect(typeof initMockResponseEditor).toBe('function');
    expect(typeof removeMockResponseEditor).toBe('function');
    expect(typeof syncMockResponseEditorSaved).toBe('function');
    expect(typeof updateMockResponseRules).toBe('function');
    expect(typeof cancelMockResponseEditorEdit).toBe('function');
  });
});
