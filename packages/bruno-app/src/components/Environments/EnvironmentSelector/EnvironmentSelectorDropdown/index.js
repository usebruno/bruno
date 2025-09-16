import React from 'react';
import { useDispatch } from 'react-redux';
import { IconSettings, IconPlus, IconDownload, IconDatabase } from '@tabler/icons';
import { selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { selectGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { updateEnvironmentSettingsModalVisibility } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';

const EnvironmentSelectorDropdown = ({
  type, // 'collection' or 'global'
  environments,
  activeEnvironmentUid,
  collection,
  onHideDropdown,
  onShowSettings,
  onShowCreate,
  onShowImport
}) => {
  const dispatch = useDispatch();

  const isGlobal = type === 'global';
  const isCollection = type === 'collection';

  const handleEnvironmentClick = (environment) => {
    const action = isGlobal
      ? selectGlobalEnvironment({ environmentUid: environment ? environment.uid : null })
      : selectEnvironment(environment ? environment.uid : null, collection.uid);

    dispatch(action)
      .then(() => {
        if (environment) {
          toast.success(`Environment changed to ${environment.name}`);
        } else {
          toast.success(`No Environments are active now`);
        }
        onHideDropdown();
      })
      .catch((err) => {
        console.log(err);
        toast.error('An error occurred while selecting the environment');
      });
  };

  const handleSettingsClick = () => {
    if (isCollection) {
      dispatch(updateEnvironmentSettingsModalVisibility(true));
    }
    onShowSettings();
    onHideDropdown();
  };

  const handleCreateClick = () => {
    onShowCreate();
    onHideDropdown();
  };

  const handleImportClick = () => {
    onShowImport();
    onHideDropdown();
  };

  // Collection-specific check
  if (isCollection && !collection) {
    return (
      <div className="no-collection-message">
        <IconDatabase size={48} strokeWidth={1} />
        <p>No collection selected. Collection environments are only available when working within a collection.</p>
      </div>
    );
  }

  const emptyStateConfig = {
    collection: {
      description: 'Create your first environment to begin working with your collection.',
      createTestId: 'create-collection-env',
      importTestId: 'import-collection-env',
      configureTestId: 'configure-collection-env'
    },
    global: {
      description: 'Create your first global environment to begin working across collections.',
      createTestId: 'create-global-env',
      importTestId: 'import-global-env',
      configureTestId: 'configure-global-env'
    }
  };

  const config = emptyStateConfig[type];

  return (
    <div className={`${type}-env-section`}>
      <div className="environment-list">
        {environments && environments.length > 0 && (
          <div className="dropdown-item no-environment" onClick={() => handleEnvironmentClick(null)}>
            <span>No Environment</span>
          </div>
        )}

        {environments && environments.length > 0 ? (
          environments.map((env) => (
            <div
              key={env.uid}
              className={`dropdown-item ${env.uid === activeEnvironmentUid ? 'active' : ''}`}
              onClick={() => handleEnvironmentClick(env)}
            >
              <span className="max-w-32 truncate no-wrap">{env.name}</span>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <h3>Ready to get started?</h3>
            <p>{config.description}</p>
            <div className="space-y-2">
              <button onClick={handleCreateClick} id={config.createTestId}>
                <IconPlus size={16} strokeWidth={1.5} />
                Create
              </button>
              <button onClick={handleImportClick} id={config.importTestId}>
                <IconDownload size={16} strokeWidth={1.5} />
                Import
              </button>
            </div>
          </div>
        )}
      </div>

      {environments && environments.length > 0 && (
        <div className="dropdown-item configure-button">
          <button onClick={handleSettingsClick} id={config.configureTestId}>
            <IconSettings size={16} strokeWidth={1.5} />
            <span>Configure</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default EnvironmentSelectorDropdown;
