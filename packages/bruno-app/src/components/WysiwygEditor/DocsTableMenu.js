import React from 'react';
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
import { DOCS_MENU_DROPDOWN_PROPS } from './docsToolbarUi';

const TABLE_MENU_GROUPS = [
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

const getTableMenuState = (editor) => {
  if (!editor?.isActive('table')) {
    return { isInTable: false, disabledById: {} };
  }

  const disabledById = {};
  TABLE_MENU_GROUPS.forEach((group) => {
    group.options.forEach((option) => {
      disabledById[option.id] = !option.canRun(editor);
    });
  });

  return { isInTable: true, disabledById };
};

const DocsTableMenu = ({ editor }) => {
  const tableMenuState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => getTableMenuState(currentEditor)
  }) ?? { isInTable: false, disabledById: {} };

  if (!editor || !tableMenuState.isInTable) {
    return null;
  }

  const { disabledById } = tableMenuState;

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
      className="docs-table-menu"
      showTickMark={false}
      groupStyle="select"
      dropdownProps={DOCS_MENU_DROPDOWN_PROPS}
    >
      <button type="button" className="heading-dropdown-trigger is-active" aria-label="Table options">
        <IconTableOptions size={16} strokeWidth={1.5} />
        <span>Table</span>
        <IconCaretDown size={14} strokeWidth={1.5} />
      </button>
    </MenuDropdown>
  );
};

export default DocsTableMenu;
