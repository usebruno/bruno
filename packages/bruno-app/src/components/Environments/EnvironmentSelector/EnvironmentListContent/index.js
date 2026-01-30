import React from 'react';
import { IconPlus, IconDownload, IconSettings } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import ColorBadge from 'components/ColorBadge';

const EnvironmentListContent = ({
  environments,
  activeEnvironmentUid,
  description,
  onEnvironmentSelect,
  onSettingsClick,
  onCreateClick,
  onImportClick
}) => {
  return (
    <div>
      {environments && environments.length > 0 ? (
        <>
          <div className="environment-list">
            <div className="dropdown-item no-environment" onClick={() => onEnvironmentSelect(null)}>
              <span>No Environment</span>
            </div>
            <ToolHint
              anchorSelect="[data-tooltip-content]"
              place="right"
              positionStrategy="fixed"
              tooltipStyle={{
                maxWidth: '200px',
                wordWrap: 'break-word'
              }}
              delayShow={1000}
            >
              <div>
                {environments.map((env) => (
                  <div
                    key={env.uid}
                    className={`dropdown-item ${env.uid === activeEnvironmentUid ? 'dropdown-item-active' : ''}`}
                    onClick={() => onEnvironmentSelect(env)}
                    data-tooltip-content={env.name}
                    data-tooltip-hidden={env.name?.length < 90}
                  >
                    <ColorBadge color={env.color} size={8} showEmptyBorder={false} />
                    <span className="max-w-100% truncate no-wrap">{env.name}</span>
                  </div>
                ))}
              </div>
            </ToolHint>
            <div className="dropdown-item configure-button">
              <button onClick={onSettingsClick} id="configure-env">
                <IconSettings size={16} strokeWidth={1.5} />
                <span>Configure</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h3>Ready to get started?</h3>
          <p>{description}</p>
          <div className="space-y-2">
            <button onClick={onCreateClick} id="create-env">
              <IconPlus size={16} strokeWidth={1.5} />
              Create
            </button>
            <button onClick={onImportClick} id="import-env">
              <IconDownload size={16} strokeWidth={1.5} />
              Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvironmentListContent;
