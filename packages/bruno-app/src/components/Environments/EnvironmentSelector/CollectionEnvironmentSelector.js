import React from 'react';
import { useDispatch } from 'react-redux';
import { IconCheck, IconSettings, IconPlus, IconDownload, IconDatabase } from '@tabler/icons';
import { selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { updateEnvironmentSettingsModalVisibility } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';

const CollectionEnvironmentSelector = ({ collection, onHideDropdown, onShowSettings, onShowCreate, onShowImport }) => {
  const dispatch = useDispatch();

  // Derived state from collection prop
  const environments = collection?.environments || [];
  const activeEnvironmentUid = collection?.activeEnvironmentUid;

  const handleEnvironmentClick = (environment) => {
    dispatch(selectEnvironment(environment ? environment.uid : null, collection.uid))
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
    dispatch(updateEnvironmentSettingsModalVisibility(true));
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

  if (!collection) {
    return (
      <div className="no-collection-message text-center py-8">
        <IconDatabase size={48} strokeWidth={1} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          No collection selected. Collection environments are only available when working within a collection.
        </p>
      </div>
    );
  }

  return (
    <div className="collection-env-section">
      <div className="environment-list">
        {environments && environments.length > 0 && (
          <div
            className="dropdown-item no-environment"
            onClick={() => handleEnvironmentClick(null)}
          >
            <div className="flex items-center justify-between w-full">
              <span>No Environment</span>
              {!activeEnvironmentUid && (
                <div className="check-icon-container">
                  <IconCheck size={10} strokeWidth={2} className="check-icon" />
                </div>
              )}
            </div>
          </div>
        )}

        {environments && environments.length ? (
          environments.map((env) => (
            <div
              key={env.uid}
              className={`dropdown-item ${
                env.uid === activeEnvironmentUid ? 'active' : ''
              }`}
              onClick={() => handleEnvironmentClick(env)}
            >
              <div className="flex items-center justify-between w-full">
                <span className='max-w-32 truncate no-wrap'>{env.name}</span>
                {env.uid === activeEnvironmentUid && (
                  <div className="check-icon-container">
                    <IconCheck size={10} strokeWidth={2} className="check-icon" />
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <h3>Ready to get started?</h3>
            <p>
              Create your first environment to begin working with your collection.
            </p>
            <div className="space-y-2">
              <button onClick={handleCreateClick}>
                <IconPlus size={16} strokeWidth={1.5} />
                Create
              </button>
              <button onClick={handleImportClick}>
                <IconDownload size={16} strokeWidth={1.5} />
                Import
              </button>
            </div>
          </div>
        )}
      </div>

      {environments && environments.length > 0 && (
        <div className="dropdown-item configure-button">
          <button
            className="flex items-center justify-center w-full"
            onClick={handleSettingsClick}
          >
            <IconSettings size={16} strokeWidth={1.5} />
            <span className="ml-2">Configure</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default CollectionEnvironmentSelector;
