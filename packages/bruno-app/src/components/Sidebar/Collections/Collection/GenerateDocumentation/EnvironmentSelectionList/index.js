import React, { useCallback, useMemo, memo } from 'react';
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
 * A selectable, virtualised list of collection environments (checkbox + color dot + name).
 * Selection is controlled by the parent via `selectedUids`. Presentational and
 * prop-driven so it can be reused wherever an environment multi-select is needed.
 */
const EnvironmentSelectionList = ({ environments = [], selectedUids = [], onToggle, disabled = false }) => {
  // O(1) membership checks regardless of how many environments are rendered.
  const selectedSet = useMemo(() => new Set(selectedUids), [selectedUids]);

  const computeItemKey = useCallback((_index, env) => env?.uid, []);

  const renderEnvironment = useCallback(
    (_index, env) => (
      <label className="env-row">
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
    <Virtuoso
      className="env-list"
      role="group"
      aria-label="Environments to include"
      style={{ height: visibleRows * ENV_ROW_HEIGHT }}
      data={environments}
      computeItemKey={computeItemKey}
      itemContent={renderEnvironment}
      fixedItemHeight={ENV_ROW_HEIGHT}
      increaseViewportBy={ENV_ROW_HEIGHT * 3}
    />
  );
};

export default memo(EnvironmentSelectionList);
