import React from 'react';

const EnvironmentSelectorDropdown = ({
  environments,
  activeEnvironmentUid,
  config,
  onEnvironmentSelect,
  onSettingsClick,
  onCreateClick,
  onImportClick
}) => {

  return (
    <div className={config.className}>
      <div className="environment-list">
        {environments && environments.length > 0 && (
          <div className="dropdown-item no-environment" onClick={() => onEnvironmentSelect(null)}>
            <span>No Environment</span>
          </div>
        )}

        {environments && environments.length > 0 ? (
          environments.map((env) => (
            <div
              key={env.uid}
              className={`dropdown-item ${env.uid === activeEnvironmentUid ? 'active' : ''}`}
              onClick={() => onEnvironmentSelect(env)}
            >
              <span className="max-w-32 truncate no-wrap">{env.name}</span>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <h3>Ready to get started?</h3>
            <p>{config.description}</p>
            <div className="space-y-2">
              <button onClick={onCreateClick} id={config.createTestId}>
                {config.createIcon}
                Create
              </button>
              <button onClick={onImportClick} id={config.importTestId}>
                {config.importIcon}
                Import
              </button>
            </div>
          </div>
        )}
      </div>

      {environments && environments.length > 0 && (
        <div className="dropdown-item configure-button">
          <button onClick={onSettingsClick} id={config.configureTestId}>
            {config.settingsIcon}
            <span>Configure</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default EnvironmentSelectorDropdown;
