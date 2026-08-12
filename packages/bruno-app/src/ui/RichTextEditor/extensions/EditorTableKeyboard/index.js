import { Extension } from '@tiptap/core';

const EditorTableKeyboard = Extension.create({
  name: 'docsTableKeyboard',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (!this.editor.isActive('table')) {
          return false;
        }

        return this.editor.commands.setHardBreak();
      }
    };
  }
});

export default EditorTableKeyboard;
