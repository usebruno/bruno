import { Extension } from '@tiptap/core';

const EditorListKeyboard = Extension.create({
  name: 'docsListKeyboard',
  priority: 1001,
  addKeyboardShortcuts() {
    return {
      'Enter': () => {
        if (this.editor.isActive('taskItem')) {
          return this.editor.commands.splitListItem('taskItem');
        }

        if (this.editor.isActive('listItem')) {
          return this.editor.commands.splitListItem('listItem');
        }

        return false;
      },
      'Tab': () => {
        if (this.editor.isActive('taskItem')) {
          return this.editor.commands.sinkListItem('taskItem');
        }

        if (this.editor.isActive('listItem')) {
          return this.editor.commands.sinkListItem('listItem');
        }

        return false;
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('taskItem')) {
          return this.editor.commands.liftListItem('taskItem');
        }

        if (this.editor.isActive('listItem')) {
          return this.editor.commands.liftListItem('listItem');
        }

        return false;
      }
    };
  }
});

export default EditorListKeyboard;
