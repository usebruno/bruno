import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconCheck, IconSettings, IconPlus, IconDownload } from '@tabler/icons';
import { selectGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import toast from 'react-hot-toast';

const GlobalEnvironmentSelector = ({ onHideDropdown, onShowSettings, onShowCreate, onShowImport }) => {
  const dispatch = useDispatch();

  // Redux selectors
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);

  const handleEnvironmentClick = (environment) => {
    dispatch(selectGlobalEnvironment({ environmentUid: environment ? environment.uid : null }))
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

  return (
    <div className="global-env-section">
      <div className="environment-list">
        {globalEnvironments && globalEnvironments.length > 0 && (
          <div
            className="dropdown-item no-environment"
            onClick={() => handleEnvironmentClick(null)}
          >
            <div className="flex items-center justify-between w-full">
              <span>No Environment</span>
              {!activeGlobalEnvironmentUid && (
                <div className="check-icon-container">
                  <IconCheck size={10} strokeWidth={2} className="check-icon" />
                </div>
              )}
            </div>
          </div>
        )}

        {globalEnvironments && globalEnvironments.length ? (
          globalEnvironments.map((env) => (
            <div
              key={env.uid}
              className={`dropdown-item ${
                env.uid === activeGlobalEnvironmentUid ? 'active' : ''
              }`}
              onClick={() => handleEnvironmentClick(env)}
            >
              <div className="flex items-center justify-between w-full">
                <span className='max-w-32 truncate no-wrap'>{env.name}</span>
                {env.uid === activeGlobalEnvironmentUid && (
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
              Create your first global environment to begin working across collections.
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

      {globalEnvironments && globalEnvironments.length > 0 && (
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

export default GlobalEnvironmentSelector;
