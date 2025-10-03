import React from 'react';
import { IconPlus, IconDownload, IconSettings } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';

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
            <div>
              {environments.map((env) => (
                <div
                  key={env.uid}
                  id={`env-tooltip-${env.uid}`}
                  className={`dropdown-item ${env.uid === activeEnvironmentUid ? 'active' : ''}`}
                  onClick={() => onEnvironmentSelect(env)}
                  data-tooltip-content={env.name}
                  data-tooltip-place="right"
                >
                  <span className="max-w-32 truncate no-wrap">{env.name}</span>
                </div>
              ))}
              <Tooltip
                anchorSelect="[data-tooltip-content]"
                style={{
                  zIndex: 99999,
                  maxWidth: '200px',
                  wordWrap: 'break-word',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem'
                }}
                positionStrategy="fixed"
              />
            </div>
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
