import { Extension } from '@tiptap/core';

const LIST_ITEM_TYPES = ['taskItem', 'listItem'];

const runForActiveListItemType = (editor, commandName) => {
  const activeType = LIST_ITEM_TYPES.find((type) => editor.isActive(type));
  return activeType ? editor.commands[commandName](activeType) : false;
};

const EditorListKeyboard = Extension.create({
  name: 'docsListKeyboard',
  priority: 1001,
  addKeyboardShortcuts() {
    return {
      'Enter': () => runForActiveListItemType(this.editor, 'splitListItem'),
      'Tab': () => runForActiveListItemType(this.editor, 'sinkListItem'),
      'Shift-Tab': () => runForActiveListItemType(this.editor, 'liftListItem')
    };
  }
});

export default EditorListKeyboard;
