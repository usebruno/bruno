import React, { useMemo, useState, useRef, forwardRef } from 'react';
import find from 'lodash/find';
import Dropdown from 'components/Dropdown';
import { IconWorld, IconDatabase, IconCaretDown } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { selectGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import toast from 'react-hot-toast';
import EnvironmentListContent from './EnvironmentListContent/index';
import CreateEnvironment from '../EnvironmentSettings/CreateEnvironment';
import ImportEnvironmentModal from 'components/Environments/Common/ImportEnvironmentModal';
import CreateGlobalEnvironment from 'components/WorkspaceHome/WorkspaceEnvironments/CreateEnvironment';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import { transparentize, toColorString, parseToRgb } from 'polished';

const TABS = [
  { id: 'collection', label: 'Collection', icon: <IconDatabase size={16} strokeWidth={1.5} /> },
  { id: 'global', label: 'Global', icon: <IconWorld size={16} strokeWidth={1.5} /> }
];

const EMPTY_STATE_DESCRIPTIONS = {
  collection: 'Create your first environment to begin working with your collection.',
  global: 'Create your first global environment to begin working across collections.'
};

/**
 * Generates background color with transparency for environment badges
 */
const getEnvBackgroundColor = (color) => (color ? transparentize(1 - 0.12, color) : 'transparent');

/**
 * Calculates the style for an environment badge section
 */
const getEnvBadgeStyle = (environment, position, hasOtherEnv) => {
  const color = environment?.color;
  const isLeft = position === 'left';

  // Determine border radius based on position and whether other env exists
  let borderRadius = '0.3rem';
  if (hasOtherEnv) {
    borderRadius = isLeft ? '0.3rem 0 0 0.3rem' : '0 0.3rem 0.3rem 0';
  }

  // Determine padding based on position
  const padding = isLeft
    ? hasOtherEnv
      ? '0.25rem 0.5rem 0.25rem 0.5rem'
      : '0.25rem 0.3rem 0.25rem 0.5rem'
    : '0.25rem 0.3rem 0.25rem 0.5rem';

  return {
    backgroundColor: getEnvBackgroundColor(color),
    padding,
    borderRadius
  };
};

/**
 * Calculates dropdown width based on longest environment name
 */
const calculateDropdownWidth = (environments, globalEnvironments) => {
  const allEnvironments = [...environments, ...globalEnvironments];
  if (allEnvironments.length === 0) return 0;

  const maxCharLength = Math.max(...allEnvironments.map((env) => env.name?.length || 0));
  // 8 pixels per character (rough estimate for average character width)
  return maxCharLength * 8;
};

/**
 * Displays a single environment with icon, name, and optional color styling
 */
const EnvironmentBadge = ({ environment, icon: Icon }) => {
  if (!environment) return null;

  const colorStyle = environment.color ? { color: environment.color } : {};

  return (
    <>
      <Icon size={14} strokeWidth={1.5} className="env-icon" style={colorStyle} />
      <ToolHint
        text={environment.name}
        toolhintId={`env-${environment.uid}`}
        place="bottom-start"
        delayShow={1000}
        hidden={environment.name?.length < 7}
      >
        <span className="env-text max-w-24 truncate overflow-hidden" style={colorStyle}>
          {environment.name}
        </span>
      </ToolHint>
    </>
  );
};

/**
 * Dropdown trigger component showing active environments
 */
const DropdownTrigger = forwardRef(({ collectionEnv, globalEnv }, ref) => {
  const hasAnyEnv = collectionEnv || globalEnv;

  // Empty state - no environments selected
  if (!hasAnyEnv) {
    return (
      <div
        ref={ref}
        className="current-environment flex align-center justify-center cursor-pointer bg-transparent no-environments"
        data-testid="environment-selector-trigger"
      >
        <span className="env-text-inactive max-w-36 truncate no-wrap">No Environment</span>
        <IconCaretDown className="caret flex items-center justify-center" size={12} strokeWidth={2} />
      </div>
    );
  }

  // Only collection env selected - caret goes with collection env
  if (collectionEnv && !globalEnv) {
    return (
      <div
        ref={ref}
        className="current-environment flex align-center justify-center cursor-pointer bg-transparent"
        style={{ padding: 0 }}
        data-testid="environment-selector-trigger"
      >
        <div className="flex items-center" style={getEnvBadgeStyle(collectionEnv, 'left', false)}>
          <EnvironmentBadge environment={collectionEnv} icon={IconDatabase} />
          <IconCaretDown className="caret flex items-center justify-center" size={12} strokeWidth={2} />
        </div>
      </div>
    );
  }

  // Only global env selected - caret goes with global env
  if (!collectionEnv && globalEnv) {
    return (
      <div
        ref={ref}
        className="current-environment flex align-center justify-center cursor-pointer bg-transparent"
        style={{ padding: 0 }}
        data-testid="environment-selector-trigger"
      >
        <div className="flex items-center" style={getEnvBadgeStyle(globalEnv, 'right', false)}>
          <EnvironmentBadge environment={globalEnv} icon={IconWorld} />
          <IconCaretDown className="caret flex items-center justify-center" size={12} strokeWidth={2} />
        </div>
      </div>
    );
  }

  // Both environments selected
  return (
    <div
      ref={ref}
      className="current-environment flex align-center justify-center cursor-pointer bg-transparent"
      style={{ padding: 0 }}
      data-testid="environment-selector-trigger"
    >
      {/* Collection Environment Section */}
      <div className="flex items-center" style={getEnvBadgeStyle(collectionEnv, 'left', true)}>
        <EnvironmentBadge environment={collectionEnv} icon={IconDatabase} />
      </div>

      {/* Separator */}
      <div className="env-separator" style={{ width: '1px', alignSelf: 'stretch' }} />

      {/* Global Environment Section + Caret */}
      <div className="flex items-center" style={getEnvBadgeStyle(globalEnv, 'right', true)}>
        <EnvironmentBadge environment={globalEnv} icon={IconWorld} />
        <IconCaretDown className="caret flex items-center justify-center" size={12} strokeWidth={2} />
      </div>
    </div>
  );
});

const EnvironmentSelector = ({ collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const [activeTab, setActiveTab] = useState('collection');
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

  const dropdownWidth = useMemo(
    () => calculateDropdownWidth(environments, globalEnvironments),
    [environments, globalEnvironments]
  );

  const description = EMPTY_STATE_DESCRIPTIONS[activeTab];

  const hideDropdown = () => dropdownTippyRef.current?.hide();

  const handleEnvironmentSelect = (environment) => {
    const action
      = activeTab === 'collection'
        ? selectEnvironment(environment?.uid || null, collection.uid)
        : selectGlobalEnvironment({ environmentUid: environment?.uid || null });

    dispatch(action)
      .then(() => {
        toast.success(environment ? `Environment changed to ${environment.name}` : 'No Environments are active now');
        hideDropdown();
      })
      .catch(() => {
        toast.error('An error occurred while selecting the environment');
      });
  };

  const handleSettingsClick = () => {
    const isCollection = activeTab === 'collection';
    dispatch(
      addTab({
        uid: `${collection.uid}-${isCollection ? 'environment' : 'global-environment'}-settings`,
        collectionUid: collection.uid,
        type: isCollection ? 'environment-settings' : 'global-environment-settings'
      })
    );
    hideDropdown();
  };

  const handleCreateClick = () => {
    if (activeTab === 'collection') {
      setShowCreateCollectionModal(true);
    } else {
      setShowCreateGlobalModal(true);
    }
    hideDropdown();
  };

  const handleImportClick = () => {
    if (activeTab === 'collection') {
      setShowImportCollectionModal(true);
    } else {
      setShowImportGlobalModal(true);
    }
    hideDropdown();
  };

  const openEnvironmentSettingsTab = (type) => {
    dispatch(
      addTab({
        uid: `${collection.uid}-${type}-settings`,
        collectionUid: collection.uid,
        type: `${type}-settings`
      })
    );
  };

  return (
    <StyledWrapper width={dropdownWidth}>
      <div className="environment-selector flex align-center cursor-pointer">
        <Dropdown
          onCreate={(ref) => (dropdownTippyRef.current = ref)}
          icon={<DropdownTrigger collectionEnv={activeCollectionEnvironment} globalEnv={activeGlobalEnvironment} />}
          placement="bottom-end"
        >
          {/* Tab Headers */}
          <div className="tab-header flex pt-3 pb-2 px-3">
            {TABS.map((tab) => (
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

      {showCreateGlobalModal && (
        <CreateGlobalEnvironment
          onClose={() => setShowCreateGlobalModal(false)}
          onEnvironmentCreated={() => openEnvironmentSettingsTab('global-environment')}
        />
      )}

      {showImportGlobalModal && (
        <ImportEnvironmentModal
          type="global"
          onClose={() => setShowImportGlobalModal(false)}
          onEnvironmentCreated={() => openEnvironmentSettingsTab('global-environment')}
        />
      )}

      {showCreateCollectionModal && (
        <CreateEnvironment
          collection={collection}
          onClose={() => setShowCreateCollectionModal(false)}
          onEnvironmentCreated={() => openEnvironmentSettingsTab('environment')}
        />
      )}

      {showImportCollectionModal && (
        <ImportEnvironmentModal
          type="collection"
          collection={collection}
          onClose={() => setShowImportCollectionModal(false)}
          onEnvironmentCreated={() => openEnvironmentSettingsTab('environment')}
        />
      )}
    </StyledWrapper>
  );
};

export default EnvironmentSelector;
