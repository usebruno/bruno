import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  IconCheck,
  IconRefresh
} from '@tabler/icons';
import Button from 'ui/Button';
import StatusBadge from 'ui/StatusBadge';
import ConfirmSyncModal from '../ConfirmSyncModal';
import SyncReviewPage from '../SyncReviewPage';
import useSyncFlow from '../hooks/useSyncFlow';

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
    isSyncing, showConfirmModal, confirmGroups,
    handleSyncNow, handleApplySync, cancelConfirmModal, handleConfirmModalSync
  } = useSyncFlow({
    collection, specDrift, remoteDrift, collectionDrift,
    sourceUrl, setError, checkForUpdates: onCheck
  });

  const lastSyncedAt = openApiSyncConfig?.lastSyncDate;

  const bannerState = useMemo(() => {
    if (fileNotFound) {
      return { variant: 'danger', message: `Source file not found at ${sourceUrl}`, actions: ['open-settings'] };
    }
    if (error || specDrift?.isValid === false) {
      return { variant: 'danger', message: error || specDrift?.error || 'Invalid OpenAPI specification', actions: [] };
    }
    if (!specDrift) {
      return null;
      // TODO: re-enable success banner
      // if (!lastSyncedAt) return null;
      // return {
      //   variant: 'success', message: 'Spec is up to date', actions: [],
      //   version: storedSpec?.info?.version,
      //   lastChecked: moment(lastCheckedAt || lastSyncedAt).fromNow()
      // };
    }
    if (specDrift.storedSpecMissing) {
      if (!lastSyncedAt) {
        return { variant: 'warning', message: 'Initial sync required — your collection differs from the spec', actions: [] };
      }
      if (specDrift.hasRemoteChanges) {
        return { variant: 'warning', message: 'Last synced spec not found — Restore the latest spec from the source to track future changes.', actions: [] };
      }
      return { variant: 'warning', message: 'Last synced spec not found — Restore the latest spec from the source to track future changes.', actions: [] };
    }
    if (specDrift.hasRemoteChanges) {
      const versionInfo = (specDrift.storedVersion && specDrift.newVersion && specDrift.storedVersion !== specDrift.newVersion)
        ? ` (v${specDrift.storedVersion} → v${specDrift.newVersion})`
        : '';
      return {
        variant: 'warning', message: `OpenAPI spec has been updated${versionInfo}`, actions: [],
        changes: { added: specDrift.added?.length || 0, modified: specDrift.modified?.length || 0, removed: specDrift.removed?.length || 0 }
      };
    }
    // return {
    //   variant: 'success', message: 'Spec is up to date', actions: [],
    //   version: specDrift.newVersion || storedSpec?.info?.version || specDrift.storedVersion,
    //   lastChecked: lastCheckedAt ? moment(lastCheckedAt).fromNow() : 'just now'
    // };
    return null;
  }, [isLoading, fileNotFound, error, sourceUrl, specDrift, lastSyncedAt, storedSpec, lastCheckedAt]);
  return (
    <>
      {bannerState && (
        <div className="spec-status-section">

          <div className={`spec-update-banner ${bannerState.variant}`}>
            <div className="banner-left">
              {bannerState.variant === 'success'
                ? <IconCheck size={16} className="status-check-icon" />
                : <div className={`status-dot ${bannerState.variant}`} />}
              <span className="banner-title">
                {bannerState.message}
                {bannerState.version && (
                  <> &middot; <code style={{ fontStyle: 'normal' }} className="checked-text">v{bannerState.version}</code></>
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
              {bannerState.actions.includes('quick-sync') && (
                <Button size="xs" onClick={handleSyncNow}>Restore Spec File</Button>
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

      {specDrift?.storedSpecMissing && openApiSyncConfig?.lastSyncDate ? (
        <div className="sync-review-empty-state mt-5">
          <IconRefresh size={40} className="empty-state-icon" />
          <h4>Last Synced Spec not found in storage</h4>
          <p>The last synced spec is missing in the storage. Restore the latest spec from the source to track future changes.</p>
          <Button className="mt-4" color="warning" onClick={handleSyncNow} loading={isSyncing}>
            Restore Spec File
          </Button>
        </div>
      ) : (
        <div className="mt-5">
          <SyncReviewPage
            specDrift={specDrift}
            remoteDrift={remoteDrift}
            collectionDrift={collectionDrift}
            collectionPath={collection.pathname}
            collectionUid={collection.uid}
            newSpec={specDrift?.newSpec}
            isSyncing={isSyncing}
            isLoading={isLoading}
            onApplySync={handleApplySync}
          />
        </div>
      )}

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
