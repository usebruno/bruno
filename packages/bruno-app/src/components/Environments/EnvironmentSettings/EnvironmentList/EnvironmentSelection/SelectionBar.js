import React from 'react';
import { IconTrash, IconX } from '@tabler/icons';
import ToolHint from 'components/ToolHint';

const SelectionBar = ({
  selectedCount,
  visibleCount,
  isSearchActive,
  isAllSelected,
  onToggleSelectAll,
  onDelete,
  onCancel
}) => (
  <div className="env-selection-bar" role="toolbar" aria-label="Environment selection actions">
    <span className="env-selection-count">
      {isSearchActive ? `${selectedCount} of ${visibleCount} selected` : `${selectedCount} selected`}
    </span>
    <button type="button" className="env-selection-link" onClick={onToggleSelectAll}>
      {isAllSelected ? 'Clear' : 'Select all'}
    </button>
    <span className="env-selection-spacer" />
    <ToolHint
      toolhintId="env-selection-delete-toolhint"
      text="Delete selected"
      place="top"
      className="env-selection-delete-wrap"
    >
      <button
        type="button"
        className="env-selection-icon-btn env-selection-delete-btn"
        onClick={onDelete}
        aria-label="Delete selected environments"
        data-testid="env-selection-delete-btn"
      >
        <IconTrash size={15} strokeWidth={1.5} />
      </button>
    </ToolHint>
    <ToolHint toolhintId="env-selection-cancel-toolhint" text="Cancel selection" place="top">
      <button
        type="button"
        className="env-selection-icon-btn"
        onClick={onCancel}
        aria-label="Cancel selection"
      >
        <IconX size={15} strokeWidth={1.5} />
      </button>
    </ToolHint>
  </div>
);

export default SelectionBar;
