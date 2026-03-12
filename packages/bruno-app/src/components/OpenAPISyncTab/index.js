import { useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuid } from 'uuid';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { setTabUiState } from 'providers/ReduxStore/slices/openapi-sync';
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
      uid: uuid(),
      collectionUid: collection.uid,
      type: 'openapi-spec'
    }));
  };

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const activeTab = useSelector((state) => state.openapiSync?.tabUiState?.[collection.uid]?.activeTab) || 'overview';
  const setActiveTab = useCallback((tab) => {
    dispatch(setTabUiState({ collectionUid: collection.uid, activeTab: tab }));
  }, [dispatch, collection.uid]);

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
      <div className="sync-page w-full">

        {/* Setup form when not configured */}
        {!isConfigured && (
          <ConnectSpecForm
            sourceUrl={sourceUrl}
            setSourceUrl={setSourceUrl}
            isLoading={isLoading}
            error={error}
            setError={setError}
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

                <CollectionStatusSection
                  collection={collection}
                  collectionDrift={collectionDrift}
                  reloadDrift={reloadDrift}
                  specDrift={specDrift}
                  storedSpec={storedSpec}
                  lastSyncDate={openApiSyncConfig?.lastSyncDate}
                  onOpenEndpoint={openEndpointInTab}
                  isLoading={isDriftLoading || isLoading}
                />
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
