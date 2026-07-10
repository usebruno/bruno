import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorState } from '@tiptap/react';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBold,
  IconCaretDown,
  IconCode,
  IconDots,
  IconItalic,
  IconList,
  IconListCheck,
  IconListNumbers,
  IconQuote,
  IconSourceCode,
  IconStrikethrough,
  IconTable,
  IconTableOptions
} from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { Tooltip } from 'react-tooltip';
import ToolbarStyledWrapper from './ToolbarStyledWrapper';
import DocsTableMenu from './DocsTableMenu';
import { DOCS_MENU_DROPDOWN_PROPS, DOCS_TOOLBAR_TOOLTIP_PROPS } from './docsToolbarUi';

const HEADING_OPTIONS = [
  { id: 'normal', label: 'Normal', level: 0 },
  { id: 'h1', label: 'Heading 1', level: 1 },
  { id: 'h2', label: 'Heading 2', level: 2 },
  { id: 'h3', label: 'Heading 3', level: 3 },
  { id: 'h4', label: 'Heading 4', level: 4 },
  { id: 'h5', label: 'Heading 5', level: 5 },
  { id: 'h6', label: 'Heading 6', level: 6 }
];

const getActiveHeadingId = (editor) => {
  if (!editor) return 'normal';
  for (let level = 1; level <= 6; level++) {
    if (editor.isActive('heading', { level })) {
      return `h${level}`;
    }
  }
  return 'normal';
};

const ToolbarButton = ({ tooltip, Icon, isActive, disabled, onClick, showLabel = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`toolbar-btn ${isActive ? 'is-active' : ''}`}
      aria-label={tooltip}
      data-tooltip-id="docs-toolbar-tooltip"
      data-tooltip-content={tooltip}
    >
      <Icon size={16} strokeWidth={1.5} />
      {showLabel && <span className="toolbar-btn-label">{tooltip}</span>}
    </button>
  );
};

const ToolbarAction = ({ editor, action, isActive, disabled, showLabel = false }) => {
  const { tooltip, Icon, run } = action;

  return (
    <ToolbarButton
      tooltip={tooltip}
      Icon={Icon}
      isActive={isActive}
      disabled={disabled}
      onClick={() => run(editor)}
      showLabel={showLabel}
    />
  );
};

const buildToolbarActions = () => [
  {
    id: 'bold',
    tooltip: 'Bold',
    Icon: IconBold,
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive('bold'),
    canRun: (editor) => editor.can().chain().focus().toggleBold().run()
  },
  {
    id: 'italic',
    tooltip: 'Italic',
    Icon: IconItalic,
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive('italic'),
    canRun: (editor) => editor.can().chain().focus().toggleItalic().run()
  },
  {
    id: 'strike',
    tooltip: 'Strikethrough',
    Icon: IconStrikethrough,
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive('strike'),
    canRun: (editor) => editor.can().chain().focus().toggleStrike().run()
  },
  {
    id: 'bulletList',
    tooltip: 'Bullet list',
    Icon: IconList,
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive('bulletList'),
    canRun: (editor) => editor.can().chain().focus().toggleBulletList().run()
  },
  {
    id: 'orderedList',
    tooltip: 'Numbered list',
    Icon: IconListNumbers,
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive('orderedList'),
    canRun: (editor) => editor.can().chain().focus().toggleOrderedList().run()
  },
  {
    id: 'taskList',
    tooltip: 'Task list',
    Icon: IconListCheck,
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
    isActive: (editor) => editor.isActive('taskList'),
    canRun: (editor) => editor.can().chain().focus().toggleTaskList().run()
  },
  {
    id: 'table',
    tooltip: 'Table',
    Icon: IconTable,
    run: (editor) => {
      const inserted = editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      if (!inserted) return;

      const { doc } = editor.state;
      if (doc.lastChild?.type.name === 'table') {
        editor.chain().insertContentAt(doc.content.size, { type: 'paragraph' }).run();
      }
    },
    isActive: (editor) => editor.isActive('table'),
    canRun: (editor) =>
      !editor.isActive('table')
      && editor.can().chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  {
    id: 'code',
    tooltip: 'Inline code',
    Icon: IconCode,
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive('code'),
    canRun: (editor) =>
      !editor.isActive('code')
      && !editor.isActive('codeBlock')
      && editor.can().chain().focus().toggleCode().run()
  },
  {
    id: 'codeBlock',
    tooltip: 'Code block',
    Icon: IconSourceCode,
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive('codeBlock'),
    canRun: (editor) =>
      !editor.isActive('codeBlock')
      && editor.can().chain().focus().toggleCodeBlock().run()
  },
  {
    id: 'blockquote',
    tooltip: 'Quote',
    Icon: IconQuote,
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive('blockquote'),
    canRun: (editor) =>
      !editor.isActive('blockquote')
      && editor.can().chain().focus().toggleBlockquote().run()
  },
  {
    id: 'undo',
    tooltip: 'Undo',
    Icon: IconArrowBackUp,
    run: (editor) => editor.chain().focus().undo().run(),
    canRun: (editor) => editor.can().chain().focus().undo().run()
  },
  {
    id: 'redo',
    tooltip: 'Redo',
    Icon: IconArrowForwardUp,
    run: (editor) => editor.chain().focus().redo().run(),
    canRun: (editor) => editor.can().chain().focus().redo().run()
  }
];

const getToolbarFormatState = (editor, toolbarActions) => {
  const activeItemIds = [];
  const disabledById = {};

  toolbarActions.forEach((action) => {
    if (action.isActive?.(editor)) {
      activeItemIds.push(action.id);
    }
    disabledById[action.id] = !(action.canRun?.(editor) ?? true);
  });

  return {
    activeHeadingId: getActiveHeadingId(editor),
    activeItemIds,
    disabledById,
    isInTable: editor.isActive('table')
  };
};

const DocsToolbar = ({ editor }) => {
  const toolbarRef = useRef(null);
  const measureRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(buildToolbarActions().length);
  const actions = useMemo(() => buildToolbarActions(), []);

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return {
          activeHeadingId: 'normal',
          activeItemIds: [],
          disabledById: {},
          isInTable: false
        };
      }

      return getToolbarFormatState(currentEditor, actions);
    }
  }) ?? {
    activeHeadingId: 'normal',
    activeItemIds: [],
    disabledById: {},
    isInTable: false
  };

  const { activeHeadingId, activeItemIds, disabledById, isInTable } = toolbarState;
  const activeHeading = HEADING_OPTIONS.find((option) => option.id === activeHeadingId) || HEADING_OPTIONS[0];

  useEffect(() => {
    const toolbarEl = toolbarRef.current;
    const measureEl = measureRef.current;
    if (!toolbarEl || !measureEl) return undefined;

    const recalculate = () => {
      const toolbarWidth = toolbarEl.offsetWidth;
      const headingWidth = measureEl.querySelector('[data-toolbar-part="heading"]')?.offsetWidth || 140;
      const tableMenuWidth = measureEl.querySelector('[data-toolbar-part="table-menu"]')?.offsetWidth || 0;
      const overflowWidth = 32;
      const gap = 4;
      let usedWidth = headingWidth + overflowWidth + gap;
      if (tableMenuWidth) {
        usedWidth += tableMenuWidth + gap;
      }
      let count = 0;

      const buttons = measureEl.querySelectorAll('[data-toolbar-part="action"]');
      for (let i = 0; i < buttons.length; i++) {
        usedWidth += buttons[i].offsetWidth + gap;
        if (usedWidth > toolbarWidth) break;
        count += 1;
      }

      setVisibleCount(Math.max(1, count));
    };

    const observer = new ResizeObserver(recalculate);
    observer.observe(toolbarEl);
    recalculate();

    return () => observer.disconnect();
  }, [actions.length, activeHeadingId, isInTable]);

  if (!editor) {
    return null;
  }

  const visibleActions = actions.slice(0, visibleCount);
  const overflowActions = actions.slice(visibleCount);
  const overflowActiveItemIds = activeItemIds.filter((id) => overflowActions.some((action) => action.id === id));

  const overflowMenuItems = overflowActions.map((action) => ({
    id: action.id,
    label: action.tooltip,
    leftSection: action.Icon,
    onClick: () => action.run(editor),
    disabled: disabledById[action.id]
  }));

  const headingMenuItems = HEADING_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
    onClick: () => {
      if (!option.level) {
        editor.chain().focus().setParagraph().run();
      } else {
        editor.chain().focus().setHeading({ level: option.level }).run();
      }
    }
  }));

  return (
    <ToolbarStyledWrapper>
      <div className="docs-toolbar" ref={toolbarRef}>
        <div className="docs-toolbar-measure" ref={measureRef} aria-hidden="true">
          <div data-toolbar-part="heading" className="heading-dropdown-trigger">
            <span>{activeHeading.label}</span>
            <IconCaretDown size={14} strokeWidth={1.5} />
          </div>
          {isInTable && (
            <div data-toolbar-part="table-menu" className="heading-dropdown-trigger is-active">
              <IconTableOptions size={16} strokeWidth={1.5} />
              <span>Table</span>
              <IconCaretDown size={14} strokeWidth={1.5} />
            </div>
          )}
          {actions.map((action) => (
            <div key={action.id} data-toolbar-part="action" className="toolbar-btn">
              <action.Icon size={16} strokeWidth={1.5} />
            </div>
          ))}
        </div>

        <MenuDropdown
          items={headingMenuItems}
          selectedItemId={activeHeadingId}
          placement="bottom-start"
          className="docs-heading-dropdown"
          dropdownProps={DOCS_MENU_DROPDOWN_PROPS}
        >
          <button
            type="button"
            className={`heading-dropdown-trigger ${activeHeadingId !== 'normal' ? 'is-active' : ''}`}
          >
            <span>{activeHeading.label}</span>
            <IconCaretDown size={14} strokeWidth={1.5} />
          </button>
        </MenuDropdown>

        <DocsTableMenu editor={editor} />

        <div className="docs-toolbar-actions">
          {visibleActions.map((action) => (
            <ToolbarAction
              key={action.id}
              editor={editor}
              action={action}
              isActive={activeItemIds.includes(action.id)}
              disabled={disabledById[action.id]}
            />
          ))}
        </div>

        {overflowActions.length > 0 && (
          <MenuDropdown
            items={overflowMenuItems}
            activeItemIds={overflowActiveItemIds}
            placement="bottom-end"
            className="docs-toolbar-overflow"
            showTickMark={false}
            dropdownProps={DOCS_MENU_DROPDOWN_PROPS}
          >
            <button type="button" className="toolbar-btn toolbar-overflow-btn" aria-label="More formatting options">
              <IconDots size={16} strokeWidth={1.5} />
            </button>
          </MenuDropdown>
        )}
      </div>
      <Tooltip id="docs-toolbar-tooltip" {...DOCS_TOOLBAR_TOOLTIP_PROPS} />
    </ToolbarStyledWrapper>
  );
};

export default DocsToolbar;
