import React, { useCallback, useEffect, useMemo, useRef, memo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import ColorBadge from 'components/ColorBadge';

// Show at most 5 environments at a glance; the list virtualises and scrolls beyond
// that, so it stays performant even for collections with hundreds of environments
// (only the visible rows are ever in the DOM).
const MAX_VISIBLE_ROWS = 5;

// Fixed row height (px). MUST stay in sync with the `.env-row` height in StyledWrapper.js,
// since it is passed to Virtuoso as `fixedItemHeight`.
const ENV_ROW_HEIGHT = 34;

/**
 * A selectable, virtualised list of collection environments (checkbox + color dot + name)
 * with a header that carries the title and a tri-state "select all" checkbox.
 *
 * Selection is controlled by the parent via `selectedUids`; `onToggleAll(nextSelectAll)`
 * fires with the desired state when the header checkbox is clicked. Presentational and
 * prop-driven so it can be reused wherever an environment multi-select is needed.
 */
const EnvironmentSelectionList = ({
  environments = [],
  selectedUids = [],
  onToggle,
  onToggleAll,
  title = 'Environments',
  disabled = false
}) => {
  // O(1) membership checks regardless of how many environments are rendered.
  const selectedSet = useMemo(() => new Set(selectedUids), [selectedUids]);

  const selectedCount = useMemo(
    () => environments.reduce((count, env) => (selectedSet.has(env?.uid) ? count + 1 : count), 0),
    [environments, selectedSet]
  );
  const allSelected = environments.length > 0 && selectedCount === environments.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const handleToggleAll = useCallback((event) => onToggleAll?.(event.target.checked), [onToggleAll]);

  const computeItemKey = useCallback((_index, env) => env?.uid, []);

  const renderEnvironment = useCallback(
    (_index, env) => (
      <label className="env-row" data-testid="env-row">
        <input
          type="checkbox"
          className="env-checkbox"
          checked={selectedSet.has(env?.uid)}
          disabled={disabled}
          onChange={() => onToggle?.(env?.uid)}
          data-testid={`env-select-${env?.uid}`}
        />
        <ColorBadge color={env?.color} size={8} />
        <span className="env-name truncate">{env?.name}</span>
      </label>
    ),
    [selectedSet, disabled, onToggle]
  );

  if (!environments.length) {
    return null;
  }

  // Fit the list to its content, capped at MAX_VISIBLE_ROWS — beyond that it scrolls.
  const visibleRows = Math.min(environments.length, MAX_VISIBLE_ROWS);

  return (
    <>
      <div className="env-section-header">
        <div className="env-section-heading">
          <h4 className="env-section-title" data-testid="env-section-title">{title}</h4>
          <span className="env-section-count" data-testid="env-selected-count">
            ({selectedCount}/{environments.length} selected)
          </span>
        </div>
        <label className="env-select-all">
          <input
            ref={selectAllRef}
            type="checkbox"
            className="env-checkbox"
            checked={allSelected}
            disabled={disabled}
            onChange={handleToggleAll}
            data-testid="env-select-all"
          />
          <span className="env-select-all-label" data-testid="env-select-all-label">Select All</span>
        </label>
      </div>
      <Virtuoso
        className="env-list"
        role="group"
        aria-label={title}
        style={{ height: visibleRows * ENV_ROW_HEIGHT }}
        data={environments}
        computeItemKey={computeItemKey}
        itemContent={renderEnvironment}
        fixedItemHeight={ENV_ROW_HEIGHT}
        increaseViewportBy={ENV_ROW_HEIGHT * 3}
      />
    </>
  );
};

export default memo(EnvironmentSelectionList);
