import React, { useState, useRef, forwardRef } from 'react';
import find from 'lodash/find';
import Dropdown from 'components/Dropdown';
import { IconWorld, IconDatabase, IconCaretDown, IconSettings, IconPlus, IconDownload } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { updateEnvironmentSettingsModalVisibility } from 'providers/ReduxStore/slices/app';
import { selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { selectGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import toast from 'react-hot-toast';
import EnvironmentSelectorDropdown from './EnvironmentList/index';
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
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showCollectionSettings, setShowCollectionSettings] = useState(false);
  const [showCreateGlobalModal, setShowCreateGlobalModal] = useState(false);
  const [showImportGlobalModal, setShowImportGlobalModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showImportCollectionModal, setShowImportCollectionModal] = useState(false);

  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);
  const activeGlobalEnvironment = activeGlobalEnvironmentUid
    ? find(globalEnvironments, (e) => e.uid === activeGlobalEnvironmentUid)
    : null;

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

  // Configuration object for dropdown
  const config = {
    className: activeTab === 'collection' ? 'collection-env-section' : 'global-env-section',
    description:
      activeTab === 'collection'
        ? 'Create your first environment to begin working with your collection.'
        : 'Create your first global environment to begin working across collections.',
    createTestId: 'create-env',
    importTestId: 'import-env',
    configureTestId: 'configure-env'
  };

  // Environment selection handler
  const handleEnvironmentSelect = (environment) => {
    const action =
      activeTab === 'collection'
        ? selectEnvironment(environment ? environment.uid : null, collection.uid)
        : selectGlobalEnvironment({ environmentUid: environment ? environment.uid : null });

    dispatch(action)
      .then(() => {
        if (environment) {
          toast.success(`Environment changed to ${environment.name}`);
        } else {
          toast.success('No Environments are active now');
        }
        dropdownTippyRef.current.hide();
      })
      .catch((err) => {
        console.log(err);
        toast.error('An error occurred while selecting the environment');
      });
  };

  // Settings handler
  const handleSettingsClick = () => {
    if (activeTab === 'collection') {
      dispatch(updateEnvironmentSettingsModalVisibility(true));
      setShowCollectionSettings(true);
    } else {
      setShowGlobalSettings(true);
    }
    dropdownTippyRef.current.hide();
  };

  // Create handler
  const handleCreateClick = () => {
    if (activeTab === 'collection') {
      setShowCreateCollectionModal(true);
    } else {
      setShowCreateGlobalModal(true);
    }
    dropdownTippyRef.current.hide();
  };

  // Import handler
  const handleImportClick = () => {
    if (activeTab === 'collection') {
      setShowImportCollectionModal(true);
    } else {
      setShowImportGlobalModal(true);
    }
    dropdownTippyRef.current.hide();
  };

  // Modal handlers
  const handleCloseSettings = () => {
    setShowGlobalSettings(false);
    setShowCollectionSettings(false);
    dispatch(updateEnvironmentSettingsModalVisibility(false));
  };

  // Create icon component for dropdown trigger
  const Icon = forwardRef((props, ref) => {
    const hasAnyEnv = activeGlobalEnvironment || activeCollectionEnvironment;

    const displayContent = hasAnyEnv ? (
      <>
        {activeCollectionEnvironment && (
          <>
            <IconDatabase size={14} strokeWidth={1.5} className="env-icon" />
            <span className="env-text max-w-24 truncate no-wrap">{activeCollectionEnvironment.name}</span>
            {activeGlobalEnvironment && <span className="env-separator">|</span>}
          </>
        )}
        {activeGlobalEnvironment && (
          <>
            <IconWorld size={14} strokeWidth={1.5} className="env-icon" />
            <span className="env-text max-w-24 truncate no-wrap">{activeGlobalEnvironment.name}</span>
          </>
        )}
      </>
    ) : (
      <span className="env-text-inactive">No environments</span>
    );

    return (
      <div
        ref={ref}
        className={`current-environment flex align-center justify-center cursor-pointer bg-transparent ${
          !hasAnyEnv ? 'no-environments' : ''
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
                className={`tab-button whitespace-nowrap pb-[0.375rem] border-b-[0.125rem] bg-transparent flex align-center cursor-pointer transition-all duration-200 mr-[1.25rem] ${
                  activeTab === tab.id ? 'active' : 'inactive'
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
            <EnvironmentSelectorDropdown
              environments={activeTab === 'collection' ? environments : globalEnvironments}
              activeEnvironmentUid={activeTab === 'collection' ? activeEnvironmentUid : activeGlobalEnvironmentUid}
              config={config}
              onEnvironmentSelect={handleEnvironmentSelect}
              onSettingsClick={handleSettingsClick}
              onCreateClick={handleCreateClick}
              onImportClick={handleImportClick}
            />
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
