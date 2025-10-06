import React, { useState, useEffect } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal';
import {
  exportGlobalEnvironment,
  exportCollectionEnvironment
} from 'utils/exporters/environments/environment-export';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const ExportModal = ({ onClose, collection }) => {
  const dispatch = useDispatch();
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);

  // Helper function to truncate environment names
  const truncateEnvName = (name) => {
    if (name.length > 40) {
      return name.substring(0, 40) + '...';
    }
    return name;
  };

  const [isExporting, setIsExporting] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [selectedEnvironments, setSelectedEnvironments] = useState({
    global: {},
    collection: {}
  });

  // Initialize selected environments
  useEffect(() => {
    const initialSelection = {
      global: {},
      collection: {}
    };

    // Add global environments
    globalEnvironments?.forEach((env) => {
      initialSelection.global[env.uid] = true;
    });

    // Add collection environments if collection is provided
    if (collection?.environments) {
      collection.environments.forEach((env) => {
        initialSelection.collection[env.uid] = true;
      });
    }

    setSelectedEnvironments(initialSelection);
  }, [globalEnvironments, collection]);

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          setFilePath(dirPath);
        }
      })
      .catch((error) => {
        setFilePath('');
        console.error(error);
      });
  };

  const handleEnvironmentToggle = (type, envUid) => {
    setSelectedEnvironments((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [envUid]: !prev[type][envUid]
      }
    }));
  };

  const handleSelectAll = (type) => {
    const environments = type === 'global' ? globalEnvironments : collection?.environments || [];
    const allSelected = environments.every((env) => selectedEnvironments[type][env.uid]);

    setSelectedEnvironments((prev) => ({
      ...prev,
      [type]: environments.reduce((acc, env) => ({
        ...acc,
        [env.uid]: !allSelected
      }), {})
    }));
  };

  const getSelectedGlobalEnvironments = () => {
    return globalEnvironments?.filter((env) => selectedEnvironments.global[env.uid]) || [];
  };

  const getSelectedCollectionEnvironments = () => {
    return collection?.environments?.filter((env) => selectedEnvironments.collection[env.uid]) || [];
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      if (!filePath) {
        toast.error('Please select a location to save the files');
        return;
      }

      const selectedGlobal = getSelectedGlobalEnvironments();
      const selectedCollection = getSelectedCollectionEnvironments();

      if (selectedGlobal.length === 0 && selectedCollection.length === 0) {
        toast.error('Please select at least one environment to export');
        return;
      }

      // Create the main bruno-environments folder path
      const brunoEnvPath = `${filePath}/bruno-environments`;

      // Export global environments if any selected
      if (selectedGlobal.length > 0) {
        const globalEnvPath = `${brunoEnvPath}/global-environments`;
        console.log('Exporting global environments to:', globalEnvPath);
        console.log('Global environments:', selectedGlobal.map((env) => env.name));
        for (const env of selectedGlobal) {
          await exportGlobalEnvironment(env, globalEnvPath);
        }
      }

      // Export collection environments if any selected
      if (selectedCollection.length > 0) {
        console.log('Exporting collection environments to:', brunoEnvPath);
        console.log('Collection environments:', selectedCollection.map((env) => env.name));
        for (const env of selectedCollection) {
          await exportCollectionEnvironment(env, brunoEnvPath);
        }
      }

      toast.success('Environments exported successfully to bruno-environments folder');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      if (error.message === 'Export cancelled by user') {
        onClose();
      } else {
        toast.error(error.message || 'Failed to export environments');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const totalSelected = getSelectedGlobalEnvironments().length + getSelectedCollectionEnvironments().length;

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="lg"
          title="Export Environments"
          hideFooter={true}
          handleCancel={onClose}
        >
          <div className="export-content">
            <div className="environments-section">
              <div className="environments-grid">
                {/* Global Environments - Left Side */}
                <div className="environment-column">
                  {globalEnvironments && globalEnvironments.length > 0 ? (
                    <div className="environment-group">
                      <div className="group-header">
                        <h3 className="font-semibold text-sm mb-2">Global Environments</h3>
                        <button
                          type="button"
                          onClick={() => handleSelectAll('global')}
                          className="text-xs text-blue-600 hover:text-blue-800 mb-2"
                        >
                          {globalEnvironments.every((env) => selectedEnvironments.global[env.uid]) ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="environment-list">
                        {globalEnvironments.map((env) => (
                          <label key={env.uid} className="environment-item">
                            <input
                              type="checkbox"
                              checked={selectedEnvironments.global[env.uid] || false}
                              onChange={() => handleEnvironmentToggle('global', env.uid)}
                              disabled={isExporting}
                            />

                            <span className="environment-name">{truncateEnvName(env.name)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="environment-group">
                      <div className="group-header">
                        <h3 className="font-semibold text-sm mb-2">Global Environments</h3>
                      </div>
                      <div className="empty-state">
                        <span className="text-xs text-gray-500">No global environments</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Collection Environments - Right Side */}
                <div className="environment-column">
                  {collection?.environments && collection.environments.length > 0 ? (
                    <div className="environment-group">
                      <div className="group-header">
                        <h3 className="font-semibold text-sm mb-2">Collection Environments</h3>
                        <button
                          type="button"
                          onClick={() => handleSelectAll('collection')}
                          className="text-xs text-blue-600 hover:text-blue-800 mb-2"
                        >
                          {collection.environments.every((env) => selectedEnvironments.collection[env.uid]) ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="environment-list">
                        {collection.environments.map((env) => (
                          <label key={env.uid} className="environment-item">
                            <input
                              type="checkbox"
                              checked={selectedEnvironments.collection[env.uid] || false}
                              onChange={() => handleEnvironmentToggle('collection', env.uid)}
                              disabled={isExporting}
                            />

                            <span className="environment-name">{truncateEnvName(env.name)}</span>

                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="environment-group">
                      <div className="group-header">
                        <h3 className="font-semibold text-sm mb-2">Collection Environments</h3>
                      </div>
                      <div className="empty-state">
                        <span className="text-xs text-gray-500">
                          {collection ? 'No collection environments' : 'No collection selected'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="location-input">
              <label htmlFor="export-location" className="block text-sm font-medium mb-2">
                Save to
              </label>
              <div className="flex gap-2">
                <input
                  id="export-location"
                  type="text"
                  className="flex-1 textbox cursor-pointer"
                  value={filePath}
                  onClick={browse}
                  onChange={(e) => setFilePath(e.target.value)}
                  disabled={isExporting}
                  placeholder="Choose folder..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  className="btn btn-secondary px-3"
                  onClick={browse}
                  disabled={isExporting}
                >
                  Browse
                </button>
              </div>
            </div>

            <div className="export-actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={onClose}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExport}
                disabled={isExporting || totalSelected === 0}
              >
                {isExporting ? 'Exporting...' : `Export ${totalSelected} Environment${totalSelected !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default ExportModal;
