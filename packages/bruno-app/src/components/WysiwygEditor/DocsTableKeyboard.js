import { Extension } from '@tiptap/core';

const DocsTableKeyboard = Extension.create({
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

export default DocsTableKeyboard;
