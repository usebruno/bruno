import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useEditorState } from '@tiptap/react';
import { getMarkRange } from '@tiptap/core';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBold,
  IconCaretDown,
  IconCode,
  IconDots,
  IconItalic,
  IconLink,
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
import DocsLinkModal from './DocsLinkModal';
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

const buildToolbarActions = (onLinkClick) => [
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
    id: 'link',
    tooltip: 'Link',
    Icon: IconLink,
    run: (editor) => onLinkClick(editor),
    isActive: (editor) => editor.isActive('link'),
    canRun: (editor) =>
      !editor.isActive('code')
      && !editor.isActive('codeBlock')
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
      && !editor.isActive('codeBlock')
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
    run: (editor) => {
      if (editor.isActive('blockquote')) {
        editor.commands.unsetBlockquote();
      } else {
        editor.chain()
          .unsetBlockquote() // unwrap any existing blockquotes to prevent nesting
          .setBlockquote()
          .command(({ tr }) => {
            let pos = 0;
            while (pos < tr.doc.content.size) {
              const node = tr.doc.nodeAt(pos);
              if (!node) {
                pos++;
                continue;
              }
              const $pos = tr.doc.resolve(pos);
              if ($pos.nodeBefore && $pos.nodeBefore.type.name === 'blockquote' && node.type.name === 'blockquote') {
                tr.join(pos);
                continue;
              }
              pos += node.nodeSize;
            }
            return true;
          })
          .run();
      }
      editor.commands.focus();
    },
    isActive: (editor) => editor.isActive('blockquote'),
    canRun: (editor) =>
      !editor.isActive('codeBlock')
      && (editor.can().unsetBlockquote() || editor.can().setBlockquote())
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
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [initialLinkData, setInitialLinkData] = useState({ text: '', url: '' });

  const handleLinkClick = useCallback((currentEditor) => {
    let selectedText = '';
    let url = '';

    if (currentEditor.isActive('link')) {
      const { from } = currentEditor.state.selection;
      const linkMarkType = currentEditor.schema.marks.link;
      const $pos = currentEditor.state.doc.resolve(from);

      const range = getMarkRange($pos, linkMarkType);
      if (range) {
        selectedText = currentEditor.state.doc.textBetween(range.from, range.to, ' ');
      }

      const attrs = currentEditor.getAttributes('link');
      url = attrs?.href || '';
    } else if (!currentEditor.state.selection.empty) {
      const { from, to } = currentEditor.state.selection;
      selectedText = currentEditor.state.doc.textBetween(from, to, ' ');
    }

    setInitialLinkData({ text: selectedText, url });
    setIsLinkModalOpen(true);
  }, []);

  useEffect(() => {
    if (editor) {
      editor.brunoOpenLinkModal = () => handleLinkClick(editor);
    }
    return () => {
      if (editor) {
        delete editor.brunoOpenLinkModal;
      }
    };
  }, [editor, handleLinkClick]);

  const handleLinkSubmit = useCallback(
    ({ text, url }) => {
      if (!editor) return;

      const chain = editor.chain().focus();

      // If we are currently inside a link, select the entire link first
      if (editor.isActive('link')) {
        chain.extendMarkRange('link');
      }

      if (!url) {
        // If url is empty, remove the link mark but keep the text
        chain.unsetLink().run();
        return;
      }

      const parsedUrl = url.trim().toLowerCase();
      if (parsedUrl.startsWith('javascript:')) {
        return;
      }

      chain
        .insertContent({
          type: 'text',
          text: text || url,
          marks: [{ type: 'link', attrs: { href: url } }]
        })
        .run();
    },
    [editor]
  );

  const actions = useMemo(() => buildToolbarActions(handleLinkClick), [handleLinkClick]);
  const [visibleCount, setVisibleCount] = useState(actions.length);

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

      setVisibleCount(count);
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
          data-testid="docs-heading-dropdown"
          {...DOCS_MENU_DROPDOWN_PROPS}
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
      <DocsLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSubmit={handleLinkSubmit}
        initialText={initialLinkData.text}
        initialUrl={initialLinkData.url}
      />
    </ToolbarStyledWrapper>
  );
};

export default DocsToolbar;
