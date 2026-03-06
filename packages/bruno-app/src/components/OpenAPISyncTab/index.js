import { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { IconLoader2, IconClock } from '@tabler/icons';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import StyledWrapper from './StyledWrapper';
import OpenAPISyncHeader from './OpenAPISyncHeader';
import ConnectSpecForm from './ConnectSpecForm';
import SpecStatusSection from './SpecStatusSection';
import CollectionStatusSection from './CollectionStatusSection';
import ConnectionSettingsModal from './ConnectionSettingsModal';
import DisconnectSyncModal from './DisconnectSyncModal';
import OverviewSection from './OverviewSection';
import useOpenAPISync from './hooks/useOpenAPISync';

const OpenAPISyncTab = ({ collection }) => {
  const {
    sourceUrl, setSourceUrl,
    isLoading,
    error, setError,
    fileNotFound,
    specDrift,
    collectionDrift,
    remoteDrift,
    isDriftLoading,
    storedSpec,
    checkForUpdates,
    handleConnect,
    handleDisconnect,
    handleSaveSettings,
    openEndpointInTab,
    reloadDrift
  } = useOpenAPISync(collection);

  const dispatch = useDispatch();
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];
  const isConfigured = !!openApiSyncConfig?.sourceUrl;

  const handleViewSpec = () => {
    dispatch(addTab({
      uid: `${collection.uid}-openapi-spec`,
      collectionUid: collection.uid,
      type: 'openapi-spec'
    }));
  };

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const hasDriftData = collectionDrift && !collectionDrift.noStoredSpec;
  const collectionChangesCount = hasDriftData
    ? (collectionDrift.modified?.length || 0) + (collectionDrift.missing?.length || 0) + (collectionDrift.localOnly?.length || 0)
    : 0;
  const specUpdatesCount = hasDriftData
    ? (specDrift?.added?.length || 0) + (specDrift?.modified?.length || 0) + (specDrift?.removed?.length || 0)
    : (remoteDrift?.modified?.length || 0) + (remoteDrift?.missing?.length || 0);

  const syncStatus = (() => {
    if (isLoading) return 'loading';
    if (error) return 'not-in-sync';
    if (!hasDriftData) return null;
    if (collectionChangesCount > 0 || specUpdatesCount > 0) return 'not-in-sync';
    return 'in-sync';
  })();

  const syncTabs = useMemo(() => [
    { key: 'overview', label: 'Overview' },
    {
      key: 'collection-changes',
      label: 'Collection Changes',
      indicator: collectionChangesCount > 0 ? <span className="tab-count">{collectionChangesCount}</span> : null
    },
    {
      key: 'spec-updates',
      label: 'Spec Updates',
      indicator: specUpdatesCount > 0 ? <span className="tab-count">{specUpdatesCount}</span> : null
    }
  ], [collectionChangesCount, specUpdatesCount]);

  return (
    <StyledWrapper className="flex flex-col h-full relative px-4 pt-4 overflow-auto">
      <div className="sync-page max-w-screen-xl">

        {/* Setup form when not configured */}
        {!isConfigured && (
          <ConnectSpecForm
            sourceUrl={sourceUrl}
            setSourceUrl={setSourceUrl}
            isLoading={isLoading}
            onConnect={handleConnect}
          />
        )}

        {/* Configured: spec header + tabs */}
        {isConfigured && (
          <>
            <OpenAPISyncHeader
              collection={collection}
              spec={storedSpec || specDrift?.newSpec}
              sourceUrl={sourceUrl}
              syncStatus={syncStatus}
              onViewSpec={handleViewSpec}
              onOpenSettings={() => setShowSettingsModal(true)}
              onOpenDisconnect={() => setShowDisconnectModal(true)}
              onCheck={checkForUpdates}
              isLoading={isLoading}
            />

            <ResponsiveTabs
              tabs={syncTabs}
              activeTab={activeTab}
              onTabSelect={setActiveTab}
            />

            {activeTab === 'overview' && (
              <div className="sync-tab-content">
                <OverviewSection
                  collection={collection}
                  storedSpec={storedSpec}
                  collectionDrift={collectionDrift}
                  specDrift={specDrift}
                  remoteDrift={remoteDrift}
                  onTabSelect={setActiveTab}
                  error={error}
                  isLoading={isLoading}
                  fileNotFound={fileNotFound}
                  onOpenSettings={() => setShowSettingsModal(true)}
                />
              </div>
            )}

            {activeTab === 'collection-changes' && (
              <div className="sync-tab-content">
                {isDriftLoading && !collectionDrift && (
                  <div className="state-message">
                    <IconLoader2 size={24} className="animate-spin" />
                    <span>Checking collection status...</span>
                  </div>
                )}
                {collectionDrift && !collectionDrift.noStoredSpec ? (
                  <CollectionStatusSection
                    collection={collection}
                    collectionDrift={collectionDrift}
                    reloadDrift={reloadDrift}
                    specDrift={specDrift}
                    storedSpec={storedSpec}
                    lastSyncDate={openApiSyncConfig?.lastSyncDate}
                    onOpenEndpoint={openEndpointInTab}
                  />
                ) : !isDriftLoading && (
                  <>
                    <div className="spec-update-banner warning">
                      <div className="banner-left">
                        <div className="status-dot warning" />
                        <span className="banner-title">
                          {openApiSyncConfig?.lastSyncDate
                            ? 'Last synced spec is required to show collection changes. Restore the latest spec from the source to track future changes..'
                            : 'Collection changes will be available after the initial sync'}
                        </span>
                      </div>
                    </div>
                    <div className="sync-review-empty-state mt-5">
                      <IconClock size={40} className="empty-state-icon" />
                      <h4>{openApiSyncConfig?.lastSyncDate ? 'Last Synced Spec missing from storage' : 'Waiting for initial sync'}</h4>
                      <p>{openApiSyncConfig?.lastSyncDate
                        ? 'Restore the latest spec from the source to track future changes..'
                        : 'Once you sync your collection with the spec, changes will appear here.'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'spec-updates' && (
              <div className="sync-tab-content">
                <SpecStatusSection
                  collection={collection}
                  sourceUrl={sourceUrl}
                  isLoading={isLoading}
                  error={error}
                  setError={setError}
                  fileNotFound={fileNotFound}
                  specDrift={specDrift}
                  storedSpec={storedSpec}
                  collectionDrift={collectionDrift}
                  remoteDrift={remoteDrift}
                  onCheck={checkForUpdates}
                  onOpenSettings={() => setShowSettingsModal(true)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {showSettingsModal && (
        <ConnectionSettingsModal
          collection={collection}
          sourceUrl={sourceUrl}
          onSave={handleSaveSettings}
          onDisconnect={() => {
            setShowSettingsModal(false);
            setShowDisconnectModal(true);
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showDisconnectModal && (
        <DisconnectSyncModal
          onConfirm={() => {
            setShowDisconnectModal(false);
            handleDisconnect();
          }}
          onClose={() => setShowDisconnectModal(false)}
        />
      )}
    </StyledWrapper>
  );
};

export default OpenAPISyncTab;
