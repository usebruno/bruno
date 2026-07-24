import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useEditorState } from '@tiptap/react';
import { getMarkRange } from '@tiptap/core';
import { HEADING_OPTIONS, buildToolbarActions } from '../utils/editorToolbarConfig';

const getActiveHeadingId = (editor) => {
  if (!editor) return 'normal';
  for (let level = 1; level <= 6; level++) {
    if (editor.isActive('heading', { level })) {
      return `h${level}`;
    }
  }
  return 'normal';
};

export const useToolbarOverflow = (editor) => {
  const toolbarRef = useRef(null);
  const measureRef = useRef(null);

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

    if (currentEditor.brunoOpenLinkEdit) {
      currentEditor.brunoOpenLinkEdit({ text: selectedText, url });
    }
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

  const actions = useMemo(() => buildToolbarActions(handleLinkClick), [handleLinkClick]);
  const [visibleCount, setVisibleCount] = useState(actions.length);

  // Trigger a re-render on editor transactions without doing heavy computations
  useEditorState({
    editor,
    selector: (ctx) => ctx.transactionNumber
  });

  const activeHeadingId = getActiveHeadingId(editor);
  const isInTable = editor ? editor.isActive('table') : false;
  const activeItemIds = useMemo(() => {
    if (!editor) return [];
    return actions.filter((action) => action.isActive?.(editor)).map((action) => action.id);
  }, [editor, actions, editor?.state]); // editor.state changes on every transaction

  const disabledById = useMemo(() => {
    if (!editor) return {};
    const disabled = {};
    actions.forEach((action) => {
      disabled[action.id] = !(action.canRun?.(editor) ?? true);
    });
    return disabled;
  }, [editor, actions, editor?.state]);

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
    return {
      toolbarRef,
      measureRef,
      actions: [],
      visibleActions: [],
      overflowActions: [],
      overflowActiveItemIds: [],
      headingMenuItems: [],
      overflowMenuItems: [],
      activeHeading: HEADING_OPTIONS[0],
      activeHeadingId: 'normal',
      activeItemIds: [],
      disabledById: {},
      isInTable: false
    };
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

  return {
    toolbarRef,
    measureRef,
    actions,
    visibleActions,
    overflowActions,
    overflowActiveItemIds,
    headingMenuItems,
    overflowMenuItems,
    activeHeading,
    activeHeadingId,
    activeItemIds,
    disabledById,
    isInTable
  };
};
