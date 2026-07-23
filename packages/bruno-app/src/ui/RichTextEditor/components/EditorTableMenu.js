import React, { useMemo } from 'react';
import { useEditorState } from '@tiptap/react';
import {
  IconCaretDown,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconTableOptions,
  IconTrash
} from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { EDITOR_MENU_DROPDOWN_PROPS } from '../utils/editorToolbarUi';

const TABLE_MENU_GROUPS = [
  {
    name: 'Table',
    options: [
      {
        id: 'deleteTable',
        label: 'Delete table',
        Icon: IconTrash,
        run: (editor) => editor.chain().focus().deleteTable().run(),
        canRun: (editor) => editor.can().chain().focus().deleteTable().run()
      }
    ]
  },
  {
    name: 'Rows',
    options: [
      {
        id: 'addRowBefore',
        label: 'Add row above',
        Icon: IconRowInsertTop,
        run: (editor) => editor.chain().focus().addRowBefore().run(),
        canRun: (editor) => editor.can().chain().focus().addRowBefore().run()
      },
      {
        id: 'addRowAfter',
        label: 'Add row below',
        Icon: IconRowInsertBottom,
        run: (editor) => editor.chain().focus().addRowAfter().run(),
        canRun: (editor) => editor.can().chain().focus().addRowAfter().run()
      },
      {
        id: 'deleteRow',
        label: 'Delete row',
        Icon: IconTrash,
        run: (editor) => editor.chain().focus().deleteRow().run(),
        canRun: (editor) => editor.can().chain().focus().deleteRow().run()
      }
    ]
  },
  {
    name: 'Columns',
    options: [
      {
        id: 'addColumnBefore',
        label: 'Add column left',
        Icon: IconColumnInsertLeft,
        run: (editor) => editor.chain().focus().addColumnBefore().run(),
        canRun: (editor) => editor.can().chain().focus().addColumnBefore().run()
      },
      {
        id: 'addColumnAfter',
        label: 'Add column right',
        Icon: IconColumnInsertRight,
        run: (editor) => editor.chain().focus().addColumnAfter().run(),
        canRun: (editor) => editor.can().chain().focus().addColumnAfter().run()
      },
      {
        id: 'deleteColumn',
        label: 'Delete column',
        Icon: IconTrash,
        run: (editor) => editor.chain().focus().deleteColumn().run(),
        canRun: (editor) => editor.can().chain().focus().deleteColumn().run()
      }
    ]
  }
];

const EditorTableMenu = ({ editor }) => {
  useEditorState({
    editor,
    selector: (ctx) => ctx.transactionNumber
  });

  const isInTable = editor ? editor.isActive('table') : false;

  const disabledById = useMemo(() => {
    if (!editor || !isInTable) return {};
    const disabled = {};
    TABLE_MENU_GROUPS.forEach((group) => {
      group.options.forEach((option) => {
        disabled[option.id] = !option.canRun(editor);
      });
    });
    return disabled;
  }, [editor, isInTable, editor?.state]);

  if (!editor || !isInTable) {
    return null;
  }

  const menuItems = TABLE_MENU_GROUPS.map((group) => ({
    name: group.name,
    options: group.options.map((option) => ({
      id: option.id,
      label: option.label,
      leftSection: option.Icon,
      disabled: disabledById[option.id],
      onClick: () => option.run(editor)
    }))
  }));

  return (
    <MenuDropdown
      items={menuItems}
      placement="bottom-start"
      className="editor-table-menu"
      showTickMark={false}
      groupStyle="select"
      dropdownProps={EDITOR_MENU_DROPDOWN_PROPS}
    >
      <button type="button" className="heading-dropdown-trigger is-active" aria-label="Table options">
        <IconTableOptions size={16} strokeWidth={1.5} />
        <span>Table</span>
        <IconCaretDown size={14} strokeWidth={1.5} fill="currentColor" />
      </button>
    </MenuDropdown>
  );
};

export default EditorTableMenu;
