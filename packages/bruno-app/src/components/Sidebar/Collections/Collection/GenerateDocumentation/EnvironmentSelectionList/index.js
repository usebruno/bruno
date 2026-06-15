import React, { useMemo, memo } from 'react';
import ColorBadge from 'components/ColorBadge';

/**
 * A selectable list of collection environments (checkbox + color dot + name).
 * Selection is controlled by the parent via `selectedUids`. Presentational and
 * prop-driven so it can be reused wherever an environment multi-select is needed.
 */
const EnvironmentSelectionList = ({ environments = [], selectedUids = [], onToggle, disabled = false }) => {
  // O(1) membership checks regardless of how many environments are rendered.
  const selectedSet = useMemo(() => new Set(selectedUids), [selectedUids]);

  return (
    <div className="env-list" role="group" aria-label="Environments to include">
      {environments.map((env) => (
        <label key={env?.uid} className="env-row">
          <input
            type="checkbox"
            className="env-checkbox"
            checked={selectedSet.has(env?.uid)}
            disabled={disabled}
            onChange={() => onToggle(env?.uid)}
            data-testid={`env-select-${env?.uid}`}
          />
          <ColorBadge color={env?.color} size={8} />
          <span className="env-name truncate">{env?.name}</span>
        </label>
      ))}
    </div>
  );
};

export default memo(EnvironmentSelectionList);
