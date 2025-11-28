import React, { useMemo, useState, useRef, forwardRef } from 'react';
import find from 'lodash/find';
import Dropdown from 'components/Dropdown';
import { IconWorld, IconDatabase, IconCaretDown, IconSettings, IconPlus, IconDownload } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { updateEnvironmentSettingsModalVisibility } from 'providers/ReduxStore/slices/app';
import { selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { selectGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import toast from 'react-hot-toast';
import EnvironmentListContent from './EnvironmentListContent/index';
import EnvironmentSettings from '../EnvironmentSettings';
import GlobalEnvironmentSettings from 'components/GlobalEnvironments/EnvironmentSettings';
import CreateEnvironment from '../EnvironmentSettings/CreateEnvironment';
import ImportEnvironmentModal from 'components/Environments/Common/ImportEnvironmentModal';
import CreateGlobalEnvironment from 'components/GlobalEnvironments/EnvironmentSettings/CreateEnvironment';
import ToolHint from 'components/ToolHint';
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

  // Get description based on active tab
  const description =
    activeTab === 'collection'
      ? 'Create your first environment to begin working with your collection.'
      : 'Create your first global environment to begin working across collections.';

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

  // Calculate dropdown width based on the longest environment name.
  // To prevent resizing while switching between collection and global environments.
  const dropdownWidth = useMemo(() => {
    const allEnvironments = [...environments, ...globalEnvironments];
    if (allEnvironments.length === 0) return 0;

    const maxCharLength = Math.max(...allEnvironments.map((env) => env.name?.length || 0));
    // 8 pixels per character: This is a rough estimate for the average character width in most fonts
    // (monospace fonts are typically 8-10px, proportional fonts vary but 8px is a safe average)
    return maxCharLength * 8;
  }, [environments, globalEnvironments]);

  // Create icon component for dropdown trigger
  const Icon = forwardRef((props, ref) => {
    const hasAnyEnv = activeGlobalEnvironment || activeCollectionEnvironment;

    const displayContent = hasAnyEnv ? (
      <>
        {activeCollectionEnvironment && (
          <>
            <div className="flex items-center">
              <IconDatabase size={14} strokeWidth={1.5} className="env-icon" />
              <ToolHint
                text={activeCollectionEnvironment.name}
                toolhintId={`collection-env-${activeCollectionEnvironment.uid}`}
                place="bottom-start"
                delayShow={1000}
                hidden={activeCollectionEnvironment.name?.length < 7}
              >
                <span className="env-text max-w-24 truncate overflow-hidden">{activeCollectionEnvironment.name}</span>
              </ToolHint>
            </div>
            {activeGlobalEnvironment && <span className="env-separator">|</span>}
          </>
        )}
        {activeGlobalEnvironment && (
          <div className="flex items-center">
            <IconWorld size={14} strokeWidth={1.5} className="env-icon" />
            <ToolHint
              text={activeGlobalEnvironment.name}
              toolhintId={`global-env-${activeGlobalEnvironment.uid}`}
              place="bottom-start"
              delayShow={1000}
              hidden={activeGlobalEnvironment.name?.length < 7}
            >
              <span className="env-text max-w-24 truncate overflow-hidden">{activeGlobalEnvironment.name}</span>
            </ToolHint>
          </div>
        )}
      </>
    ) : (
      <span className="env-text-inactive max-w-36 truncate no-wrap">No environments</span>
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
    <StyledWrapper width={dropdownWidth}>
      <div className="environment-selector flex align-center cursor-pointer">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          {/* Tab Headers */}
          <div className="tab-header flex p-[0.75rem]">
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
            <EnvironmentListContent
              environments={activeTab === 'collection' ? environments : globalEnvironments}
              activeEnvironmentUid={activeTab === 'collection' ? activeEnvironmentUid : activeGlobalEnvironmentUid}
              description={description}
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
          collection={collection}
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
        <ImportEnvironmentModal
          type="global"
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
        <ImportEnvironmentModal
          type="collection"
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
