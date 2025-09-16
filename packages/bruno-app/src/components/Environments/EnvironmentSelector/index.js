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
  const activeGlobalEnvironment = activeGlobalEnvironmentUid
    ? find(globalEnvironments, (e) => e.uid === activeGlobalEnvironmentUid)
    : null;

  // Collection environment state (only for display in trigger button)
  const environments = collection?.environments || [];
  const activeEnvironmentUid = collection?.activeEnvironmentUid;
  const activeCollectionEnvironment = activeEnvironmentUid
    ? find(environments, (e) => e.uid === activeEnvironmentUid)
    : null;

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
        <>
          <IconDatabase size={14} strokeWidth={1.5} className="env-icon" />
          <span className="env-text max-w-24 truncate no-wrap">{activeCollectionEnvironment.name}</span>
          <span className="env-separator">|</span>
          <IconWorld size={14} strokeWidth={1.5} className="env-icon" />
          <span className="env-text max-w-24 truncate no-wrap">{activeGlobalEnvironment.name}</span>
        </>
      );
    } else if (hasGlobalEnv) {
      // Only global environment exists
      displayContent = (
        <>
          <IconWorld size={14} strokeWidth={1.5} className="env-icon" />
          <span className="env-text max-w-24 truncate no-wrap">{activeGlobalEnvironment.name}</span>
        </>
      );
    } else if (hasCollectionEnv) {
      // Only collection environment exists
      displayContent = (
        <>
          <IconDatabase size={14} strokeWidth={1.5} className="env-icon" />
          <span className="env-text max-w-24 truncate no-wrap">{activeCollectionEnvironment.name}</span>
        </>
      );
    } else {
      // No environments selected
      displayContent = <span className="env-text-inactive">No environments</span>;
    }

    return (
      <div
        ref={ref}
        className={`current-environment flex align-center justify-center cursor-pointer bg-transparent ${
          !hasGlobalEnv && !hasCollectionEnv ? 'no-environments' : ''
        }`}
        data-testid="environment-selector-trigger"
      >
        {displayContent}
        <IconCaretDown className="caret" size={14} strokeWidth={2} />
      </div>
    );
  });

  return (
    <StyledWrapper>
      <div className="environment-selector flex align-center cursor-pointer">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          {/* Tab Headers */}
          <div className="tab-header flex justify-center p-[0.75rem]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button whitespace-nowrap pb-[0.375rem] border-b-[0.125rem] border-transparent border-none bg-transparent flex align-center cursor-pointer transition-all duration-200 mr-[1.25rem] ${
                  activeTab === tab.id ? 'active' : ''
                }`}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`env-tab-${tab.id}`}
              >
                <span className="tab-content-wrapper">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'collection' && (
              <CollectionEnvironmentSelector
                collection={collection}
                onHideDropdown={() => dropdownTippyRef.current.hide()}
                onShowSettings={() => setShowCollectionSettings(true)}
                onShowCreate={() => setShowCreateCollectionModal(true)}
                onShowImport={() => setShowImportCollectionModal(true)}
              />
            )}

            {activeTab === 'global' && (
              <GlobalEnvironmentSelector
                onHideDropdown={() => dropdownTippyRef.current.hide()}
                onShowSettings={() => setShowGlobalSettings(true)}
                onShowCreate={() => setShowCreateGlobalModal(true)}
                onShowImport={() => setShowImportGlobalModal(true)}
              />
            )}
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

      {showCollectionSettings && <EnvironmentSettings collection={collection} onClose={handleCloseSettings} />}

      {showCreateGlobalModal && (
        <CreateGlobalEnvironment
          onClose={() => setShowCreateGlobalModal(false)}
          onEnvironmentCreated={() => {
            setShowGlobalSettings(true);
          }}
        />
      )}

      {showImportGlobalModal && (
        <ImportGlobalEnvironment
          onClose={() => setShowImportGlobalModal(false)}
          onEnvironmentCreated={() => {
            setShowGlobalSettings(true);
          }}
        />
      )}

      {showCreateCollectionModal && (
        <CreateEnvironment
          collection={collection}
          onClose={() => setShowCreateCollectionModal(false)}
          onEnvironmentCreated={() => {
            setShowCollectionSettings(true);
          }}
        />
      )}

      {showImportCollectionModal && (
        <ImportEnvironment
          collection={collection}
          onClose={() => setShowImportCollectionModal(false)}
          onEnvironmentCreated={() => {
            setShowCollectionSettings(true);
          }}
        />
      )}
    </StyledWrapper>
  );
};

export default EnvironmentSelector;
