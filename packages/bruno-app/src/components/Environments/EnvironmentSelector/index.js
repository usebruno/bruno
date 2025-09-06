import React, { useState, useRef, forwardRef } from 'react';
import find from 'lodash/find';
import Dropdown from 'components/Dropdown';
import { IconWorld, IconDatabase, IconCaretDown } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { updateEnvironmentSettingsModalVisibility } from 'providers/ReduxStore/slices/app';
import GlobalEnvironmentSelector from './GlobalEnvironmentSelector';
import CollectionEnvironmentSelector from './CollectionEnvironmentSelector';
import EnvironmentSettings from '../EnvironmentSettings';
import GlobalEnvironmentSettings from 'components/GlobalEnvironments/EnvironmentSettings';
import CreateEnvironment from '../EnvironmentSettings/CreateEnvironment';
import ImportEnvironment from '../EnvironmentSettings/ImportEnvironment';
import CreateGlobalEnvironment from 'components/GlobalEnvironments/EnvironmentSettings/CreateEnvironment';
import ImportGlobalEnvironment from 'components/GlobalEnvironments/EnvironmentSettings/ImportEnvironment';
import StyledWrapper from './StyledWrapper';

const EnvironmentSelector = ({ collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const [activeTab, setActiveTab] = useState('collection');

  // Modal states
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showCollectionSettings, setShowCollectionSettings] = useState(false);
  const [showCreateGlobalModal, setShowCreateGlobalModal] = useState(false);
  const [showImportGlobalModal, setShowImportGlobalModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showImportCollectionModal, setShowImportCollectionModal] = useState(false);

  // Global environment state (only for display in trigger button)
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);
  const activeGlobalEnvironment = activeGlobalEnvironmentUid ? find(globalEnvironments, (e) => e.uid === activeGlobalEnvironmentUid) : null;

  // Collection environment state (only for display in trigger button)
  const environments = collection?.environments || [];
  const activeEnvironmentUid = collection?.activeEnvironmentUid;
  const activeCollectionEnvironment = activeEnvironmentUid ? find(environments, (e) => e.uid === activeEnvironmentUid) : null;

  const tabs = [
    { id: 'collection', label: 'Collection', icon: <IconDatabase size={16} strokeWidth={1.5} /> },
    { id: 'global', label: 'Global', icon: <IconWorld size={16} strokeWidth={1.5} /> }
  ];


  const onDropdownCreate = (ref) => {
    dropdownTippyRef.current = ref;
  };

  // Modal handlers
  const handleCloseSettings = () => {
    setShowGlobalSettings(false);
    setShowCollectionSettings(false);
    dispatch(updateEnvironmentSettingsModalVisibility(false));
  };

  // Create icon component for dropdown trigger
  const Icon = forwardRef((props, ref) => {
    // Determine what to display based on current environment state
    const hasGlobalEnv = !!activeGlobalEnvironment;
    const hasCollectionEnv = !!activeCollectionEnvironment;

    let displayContent;

    if (hasGlobalEnv && hasCollectionEnv) {
      // Both environments exist - show both with icons
      displayContent = (
        <div className="flex items-center">
          <IconDatabase size={14} strokeWidth={1.5} className="env-icon" />
          <span className="env-text max-w-24 truncate no-wrap">{activeCollectionEnvironment.name}</span>
          <span className="env-separator">|</span>
          <IconWorld size={14} strokeWidth={1.5} className="env-icon" />
          <span className="env-text max-w-24 truncate no-wrap">{activeGlobalEnvironment.name}</span>
        </div>
      );
    } else if (hasGlobalEnv) {
      // Only global environment exists
      displayContent = (
        <div className="flex items-center">
          <IconWorld size={14} strokeWidth={1.5} className="env-icon" />
          <span className="env-text max-w-24 truncate no-wrap">{activeGlobalEnvironment.name}</span>
        </div>
      );
    } else if (hasCollectionEnv) {
      // Only collection environment exists
      displayContent = (
        <div className="flex items-center">
          <IconDatabase size={14} strokeWidth={1.5} className="env-icon" />
          <span className="env-text max-w-24 truncate no-wrap">{activeCollectionEnvironment.name}</span>
        </div>
      );
    } else {
      // No environments selected
      displayContent = (
        <span className="env-text-inactive">No environments</span>
      );
    }

    return (
      <div ref={ref} className="current-environment collection-environment flex items-center justify-center pl-3 pr-2 py-1 select-none">
        <p className="text-nowrap truncate max-w-32" title={activeEnvironment ? activeEnvironment.name : 'No Environment'}>{activeEnvironment ? activeEnvironment.name : 'No Environment'}</p>
        <IconCaretDown className="caret" size={14} strokeWidth={2} />
      </div>
    );
  });

  return (
    <StyledWrapper>
      <div className="flex items-center cursor-pointer environment-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          {/* Tab Headers */}
          <div className="tab-header flex flex-row justify-start gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-content-wrapper">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
          <div className="dropdown-item border-top" onClick={() => {
            handleSettingsIconClick();
            dropdownTippyRef.current.hide();
          }}>
            <div className="pr-2 text-gray-600" id="Configure">
              <IconSettings size={18} strokeWidth={1.5} />
            </div>
            <span>Configure</span>
          </div>
        </Dropdown>
      </div>

      {/* Modals - Rendered outside dropdown to avoid conflicts */}
      {showGlobalSettings && (
        <GlobalEnvironmentSettings
          globalEnvironments={globalEnvironments}
          activeGlobalEnvironmentUid={activeGlobalEnvironmentUid}
          onClose={handleCloseSettings}
        />
      )}

      {showCollectionSettings && (
        <EnvironmentSettings
          collection={collection}
          onClose={handleCloseSettings}
        />
      )}

      {showCreateGlobalModal && (
        <CreateGlobalEnvironment onClose={() => setShowCreateGlobalModal(false)} />
      )}

      {showImportGlobalModal && (
        <ImportGlobalEnvironment onClose={() => setShowImportGlobalModal(false)} />
      )}

      {showCreateCollectionModal && (
        <CreateEnvironment collection={collection} onClose={() => setShowCreateCollectionModal(false)} />
      )}

      {showImportCollectionModal && (
        <ImportEnvironment collection={collection} onClose={() => setShowImportCollectionModal(false)} />
      )}
    </StyledWrapper>
  );
};

export default EnvironmentSelector;
