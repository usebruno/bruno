import { useSelector } from 'react-redux';
import {
  IconRefresh,
  IconCheck
} from '@tabler/icons';
import moment from 'moment';
import Button from 'ui/Button';
import StatusBadge from 'ui/StatusBadge';
import ConfirmSyncModal from './ConfirmSyncModal';
import SyncReviewPage from './SyncReviewPage';
import useSyncFlow from './useSyncFlow';

const getSpecStatusState = ({
  isLoading, error, fileNotFound, sourceUrl, specDrift, openApiSyncConfig, storedSpec, lastCheckedAt
}) => {
  if (isLoading) {
    return { variant: 'muted', message: 'Checking for updates...', actions: [] };
  }

  if (fileNotFound) {
    return { variant: 'danger', message: `Source file not found at ${sourceUrl}`, actions: ['open-settings'] };
  }

  if (error || specDrift?.isValid === false) {
    return { variant: 'danger', message: error || specDrift?.error || 'Invalid OpenAPI specification', actions: ['check'] };
  }

  const lastSyncedAt = openApiSyncConfig?.lastSyncDate;

  if (!specDrift) {
    if (!lastSyncedAt) return null;
    return {
      variant: 'success', message: 'Spec is up to date', actions: ['check'],
      version: storedSpec?.info?.version,
      lastChecked: moment(lastCheckedAt || lastSyncedAt).fromNow()
    };
  }

  if (specDrift.storedSpecMissing) {
    if (!lastSyncedAt) {
      return { variant: 'info', message: 'Review required — your collection differs from the spec', actions: ['check', 'review-sync'] };
    }
    if (specDrift.hasRemoteChanges) {
      return { variant: 'warning', message: 'Local spec file not found — sync to restore', actions: ['check', 'review-sync'] };
    }
    return { variant: 'warning', message: 'Local spec file not found — collection matches remote', actions: ['check', 'quick-sync'] };
  }

  if (specDrift.hasRemoteChanges) {
    const versionInfo = (specDrift.storedVersion && specDrift.newVersion && specDrift.storedVersion !== specDrift.newVersion)
      ? ` (v${specDrift.storedVersion} → v${specDrift.newVersion})`
      : '';
    return {
      variant: 'warning', message: `OpenAPI spec has been updated${versionInfo}`, actions: ['check', 'review-sync'],
      changes: { added: specDrift.added?.length || 0, modified: specDrift.modified?.length || 0, removed: specDrift.removed?.length || 0 }
    };
  }

  return {
    variant: 'success', message: 'Spec is up to date', actions: ['check'],
    version: specDrift.newVersion || storedSpec?.info?.version || specDrift.storedVersion,
    lastChecked: lastCheckedAt ? moment(lastCheckedAt).fromNow() : 'just now'
  };
};

const SpecStatusSection = ({
  collection, sourceUrl,
  isLoading, error, setError, fileNotFound,
  specDrift, storedSpec,
  collectionDrift, remoteDrift,
  onCheck, onOpenSettings
}) => {
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];
  const lastCheckedAt = useSelector((state) => state.openapiSync?.collectionUpdates?.[collection.uid]?.lastChecked);

  const {
    viewMode, isSyncing, showConfirmModal, confirmGroups,
    enterReviewMode, handleSyncNow, handleGoBackFromReview,
    handleApplySync, cancelConfirmModal, handleConfirmModalSync
  } = useSyncFlow({
    collection, specDrift, remoteDrift, collectionDrift,
    sourceUrl, setError, checkForUpdates: onCheck
  });

  // Review mode
  if (viewMode === 'review') {
    return (
      <SyncReviewPage
        specDrift={specDrift}
        remoteDrift={remoteDrift}
        collectionDrift={collectionDrift}
        collectionPath={collection.pathname}
        collectionUid={collection.uid}
        newSpec={specDrift?.newSpec}
        isSyncing={isSyncing}
        onGoBack={handleGoBackFromReview}
        onApplySync={handleApplySync}
      />
    );
  }

  // Configured + tabs mode
  const bannerState = getSpecStatusState({
    isLoading, error, fileNotFound, sourceUrl, specDrift, openApiSyncConfig, storedSpec, lastCheckedAt
  });
  const canCheck = !!sourceUrl?.trim();

  return (
    <>
      {bannerState && (
        <div className="spec-status-section">
          <div className="sync-summary-title-row">
            <div>
              <div className="sync-summary-title">Spec Status</div>
              <div className="sync-summary-subtitle">Checks if the spec has changed at the source URL</div>
            </div>
          </div>

          <div className={`spec-update-banner ${bannerState.variant}`}>
            <div className="banner-left">
              {bannerState.variant === 'success'
                ? <IconCheck size={16} className="status-check-icon" />
                : <div className={`status-dot ${bannerState.variant}`} />}
              <span className="banner-title">
                {bannerState.message}
                {bannerState.version && (
                  <> &middot; <code className="version-code">v{bannerState.version}</code></>
                )}
                {bannerState.lastChecked && (
                  <span className="checked-text"> &middot; Checked {bannerState.lastChecked}</span>
                )}
              </span>
              {bannerState.changes && (
                <span className="banner-details">
                  {bannerState.changes.added > 0 && <StatusBadge key="added" status="success" radius="full">{bannerState.changes.added} {bannerState.changes.added > 1 ? 'endpoints' : 'endpoint'} added</StatusBadge>}
                  {bannerState.changes.modified > 0 && <StatusBadge key="modified" status="info" radius="full">{bannerState.changes.modified} {bannerState.changes.modified > 1 ? 'endpoints' : 'endpoint'} updated</StatusBadge>}
                  {bannerState.changes.removed > 0 && <StatusBadge key="removed" status="danger" radius="full">{bannerState.changes.removed} {bannerState.changes.removed > 1 ? 'endpoints' : 'endpoint'} removed</StatusBadge>}
                </span>
              )}
            </div>
            <div className="banner-actions">
              {bannerState.actions.includes('check') && (
                <Button
                  color="secondary"
                  size="sm"
                  onClick={onCheck}
                  disabled={!canCheck}
                  loading={isLoading}
                  icon={<IconRefresh size={14} />}
                >
                  Check for updates
                </Button>
              )}
              {bannerState.actions.includes('review-sync') && (
                <Button size="sm" onClick={enterReviewMode}>Review and Sync Collection</Button>
              )}
              {bannerState.actions.includes('quick-sync') && (
                <Button size="sm" onClick={handleSyncNow}>Restore Spec File</Button>
              )}
              {bannerState.actions.includes('open-settings') && (
                <Button variant="ghost" size="sm" onClick={onOpenSettings}>
                  Update connection settings
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm sync modal */}
      {showConfirmModal && (
        <ConfirmSyncModal
          groups={confirmGroups}
          isSyncing={isSyncing}
          onCancel={cancelConfirmModal}
          onSync={handleConfirmModalSync}
        />
      )}
    </>
  );
};

export default SpecStatusSection;
