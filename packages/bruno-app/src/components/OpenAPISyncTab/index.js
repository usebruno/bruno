import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuid } from 'uuid';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { IconLoader2 } from '@tabler/icons';
import { selectTabUiState } from 'providers/ReduxStore/slices/openapi-sync';
import StyledWrapper from './StyledWrapper';
import SpecInfoCard from './SpecInfoCard';
import ConnectSpecForm from './ConnectSpecForm';
import SpecStatusSection from './SpecStatusSection';
import CollectionStatusSection from './CollectionStatusSection';
import ConnectionSettingsModal from './ConnectionSettingsModal';
import DisconnectSyncModal from './DisconnectSyncModal';
import useOpenAPISync from './useOpenAPISync';

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

  const tabUiState = useSelector(selectTabUiState(collection.uid));
  const viewMode = tabUiState.viewMode || 'tabs';

  const handleViewSpec = () => {
    dispatch(addTab({
      uid: uuid(),
      collectionUid: collection.uid,
      type: 'openapi-spec'
    }));
  };

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  return (
    <StyledWrapper className={`flex flex-col h-full relative px-4 py-4 overflow-auto ${viewMode === 'review' ? ' review-active' : ''}`}>
      <div className="sync-page max-w-screen-xl">

        {/* Spec header — hidden during review mode and when not configured */}
        {isConfigured && viewMode === 'tabs' && (
          <SpecInfoCard
            collection={collection}
            spec={storedSpec || specDrift?.newSpec}
            sourceUrl={sourceUrl}
            onViewSpec={handleViewSpec}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenDisconnect={() => setShowDisconnectModal(true)}
          />
        )}

        {/* Setup form when not configured, spec status when configured */}
        {!isConfigured ? (
          <ConnectSpecForm
            sourceUrl={sourceUrl}
            setSourceUrl={setSourceUrl}
            isLoading={isLoading}
            onConnect={handleConnect}
          />
        ) : (
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
        )}

        {/* Collection drift status — hidden during review mode and when not configured */}
        {isConfigured && viewMode === 'tabs' && (
          <>
            {isDriftLoading && !collectionDrift && (
              <div className="state-message">
                <IconLoader2 size={24} className="animate-spin" />
                <span>Checking collection status...</span>
              </div>
            )}

            {collectionDrift && !collectionDrift.noStoredSpec && (
              <CollectionStatusSection
                collection={collection}
                collectionDrift={collectionDrift}
                reloadDrift={reloadDrift}
                specDrift={specDrift}
                storedSpec={storedSpec}
                lastSyncDate={openApiSyncConfig?.lastSyncDate}
                onOpenEndpoint={openEndpointInTab}
              />
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
