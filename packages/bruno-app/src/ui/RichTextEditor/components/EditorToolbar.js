import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useEditorState } from '@tiptap/react';
import { getMarkRange } from '@tiptap/core';
import { IconCaretDown, IconDots, IconTableOptions } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { Tooltip } from 'react-tooltip';
import ToolbarStyledWrapper from './ToolbarStyledWrapper';
import EditorTableMenu from './EditorTableMenu';
import { EDITOR_MENU_DROPDOWN_PROPS, EDITOR_TOOLBAR_TOOLTIP_PROPS } from '../utils/editorToolbarUi';
import { useToolbarOverflow } from '../utils/useToolbarOverflow';

const ToolbarButton = ({ tooltip, Icon, isActive, disabled, onClick, showLabel = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`toolbar-btn ${isActive ? 'is-active' : ''}`}
      aria-label={tooltip}
      data-tooltip-id="editor-toolbar-tooltip"
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

const EditorToolbar = ({ editor }) => {
  const {
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
  } = useToolbarOverflow(editor);

  if (!editor) {
    return null;
  }

  return (
    <ToolbarStyledWrapper>
      <div className="editor-toolbar" ref={toolbarRef}>
        <div className="editor-toolbar-measure" ref={measureRef} aria-hidden="true">
          <div data-toolbar-part="heading" className="heading-dropdown-trigger">
            <span>{activeHeading.label}</span>
            <IconCaretDown size={14} strokeWidth={1.5} fill="currentColor" />
          </div>
          {isInTable && (
            <div data-toolbar-part="table-menu" className="heading-dropdown-trigger is-active">
              <IconTableOptions size={16} strokeWidth={1.5} />
              <span>Table</span>
              <IconCaretDown size={14} strokeWidth={1.5} fill="currentColor" />
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
          {...EDITOR_MENU_DROPDOWN_PROPS}
        >
          <button
            type="button"
            className={`heading-dropdown-trigger ${activeHeadingId !== 'normal' ? 'is-active' : ''}`}
          >
            <span>{activeHeading.label}</span>
            <IconCaretDown size={14} strokeWidth={1.5} fill="currentColor" />
          </button>
        </MenuDropdown>

        <EditorTableMenu editor={editor} />

        <div className="editor-toolbar-actions">
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
            dropdownProps={EDITOR_MENU_DROPDOWN_PROPS}
          >
            <button type="button" className="toolbar-btn toolbar-overflow-btn" aria-label="More formatting options">
              <IconDots size={16} strokeWidth={1.5} />
            </button>
          </MenuDropdown>
        )}
      </div>
      <Tooltip id="editor-toolbar-tooltip" {...EDITOR_TOOLBAR_TOOLTIP_PROPS} />
    </ToolbarStyledWrapper>
  );
};

export default EditorToolbar;
