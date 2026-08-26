import React, { memo } from 'react';
import { IconCopy, IconArrowsExchange } from '@tabler/icons';
import { ResolutionButton } from '../ReviewStep/StyledWrapper';
import { RESOLUTION_TYPES, RESOLUTION_LABELS } from '../utils';

const RESOLUTION_OPTIONS = [
  {
    value: RESOLUTION_TYPES.COPY,
    label: RESOLUTION_LABELS[RESOLUTION_TYPES.COPY],
    icon: IconCopy,
    testId: 'env-import-copy-btn'
  },
  {
    value: RESOLUTION_TYPES.REPLACE,
    label: RESOLUTION_LABELS[RESOLUTION_TYPES.REPLACE],
    icon: IconArrowsExchange,
    testId: 'env-import-replace-btn'
  }
];

const EnvironmentRow = ({ env, isSelected, resolution, toggleItemSelection, setItemResolution, showResolutions }) => {
  const displayName = env.filePath || env.fileName;

  return (
    <div className="env-item" data-testid="env-import-item">
      <label className="env-item-label">
        <input
          type="checkbox"
          className="env-item-checkbox"
          checked={isSelected}
          onChange={() => toggleItemSelection(env.id)}
          data-testid="env-import-item-checkbox"
        />
        <div className="env-item-content">
          <div className="env-name">{env.name}</div>
          {displayName && (
            <div className="env-filepath" title={displayName}>
              {displayName}
            </div>
          )}
        </div>
      </label>
      {showResolutions && (
        <div className="env-actions">
          {RESOLUTION_OPTIONS.map(({ value, label, icon: Icon, testId }) => {
            const selected = resolution === value;

            return (
              <ResolutionButton
                key={value}
                $selected={selected}
                aria-pressed={selected}
                onClick={() => setItemResolution(env.id, value)}
                title={label}
                data-testid={testId}
              >
                <Icon size={16} />
              </ResolutionButton>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default memo(EnvironmentRow);
