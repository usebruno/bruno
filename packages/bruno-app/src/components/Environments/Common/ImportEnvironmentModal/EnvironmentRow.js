import React from 'react';
import { IconCopy, IconArrowsExchange } from '@tabler/icons';
import { ResolutionButton } from './StyledWrapper';

const EnvironmentRow = ({ env, isSelected, resolution, toggleItemSelection, setItemResolution, showResolutions }) => {
  return (
    <div className="env-item" data-testid="env-import-item">
      <label className="env-item-label">
        <input
          type="checkbox"
          className="env-item-checkbox"
          checked={isSelected}
          onChange={() => toggleItemSelection(env)}
          data-testid="env-import-item-checkbox"
        />
        <div className="env-item-content">
          <div className="env-name">{env.name}</div>
          {(env.filePath || env.fileName) && (
            <div className="env-filepath" title={env.filePath || env.fileName}>
              {env.filePath || env.fileName}
            </div>
          )}
        </div>
      </label>
      {showResolutions && (
        <div className="env-actions">
          <ResolutionButton
            $selected={resolution === 'copy'}
            aria-pressed={resolution === 'copy'}
            onClick={() => setItemResolution(env, 'copy')}
            title="Import as copy"
            data-testid="env-import-copy-btn"
          >
            <IconCopy size={16} />
          </ResolutionButton>
          <ResolutionButton
            $selected={resolution === 'replace'}
            aria-pressed={resolution === 'replace'}
            onClick={() => setItemResolution(env, 'replace')}
            title="Replace existing"
            data-testid="env-import-replace-btn"
          >
            <IconArrowsExchange size={16} />
          </ResolutionButton>
        </div>
      )}
    </div>
  );
};

export default EnvironmentRow;
