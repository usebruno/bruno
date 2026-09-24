import { useMemo } from 'react';
import {
  IconCheck,
  IconPlus,
  IconTrash,
  IconArrowBackUp,
  IconExternalLink,
  IconAlertTriangle,
  IconInfoCircle,
  IconLoader2
} from '@tabler/icons';
import moment from 'moment';
import Button from 'ui/Button';
import StatusBadge from 'ui/StatusBadge';
import Modal from 'components/Modal';
import EndpointChangeSection from '../EndpointChangeSection';
import ExpandableEndpointRow from '../EndpointChangeSection/ExpandableEndpointRow';
import useEndpointActions from '../hooks/useEndpointActions';

const CollectionStatusSection = ({
  collection,
  collectionDrift,
  reloadDrift,
  specDrift,
  storedSpec,
  lastSyncDate,
  onOpenEndpoint,
  isLoading,
  onTabSelect
}) => {
  const {
    pendingAction, setPendingAction,
    confirmPendingAction,
    handleResetEndpoint,
    handleResetAllModified,
    handleDeleteEndpoint,
    handleDeleteAllLocalOnly,
    handleRevertAllChanges,
    handleAddMissingEndpoint,
    handleAddAllMissing
  } = useEndpointActions(collection, collectionDrift, reloadDrift);

  const spec = storedSpec || specDrift?.newSpec;
  const hasStoredSpec = collectionDrift && !collectionDrift.noStoredSpec;
  const hasDrift = hasStoredSpec && (collectionDrift.modified?.length > 0
    || collectionDrift.missing?.length > 0
    || collectionDrift.localOnly?.length > 0);

  const renderDriftRow = (endpoint, idx, actions) => (
    <ExpandableEndpointRow
      key={endpoint.id}
      endpoint={endpoint}
      collectionPath={collection.pathname}
      newSpec={spec}
      showDecisions={false}
      diffLeftLabel="Last Synced Spec"
      diffRightLabel="Current (in collection)"
      swapDiffSides
      collectionUid={collection.uid}
      actions={actions}
    />
  );

  const modifiedCount = collectionDrift?.modified?.length || 0;
  const missingCount = collectionDrift?.missing?.length || 0;
  const localOnlyCount = collectionDrift?.localOnly?.length || 0;
  const version = specDrift?.storedVersion || storedSpec?.info?.version;

  const bannerState = useMemo(() => {
    if (hasDrift) {
      return {
        variant: 'muted',
        message: 'Collection has changes since last sync',
        badges: { modifiedCount, missingCount, localOnlyCount },
        actions: ['revert-all']
      };
    }
    return null;
  }, [hasDrift, modifiedCount, missingCount, localOnlyCount, version, lastSyncDate]);

  return (
    <div className="collection-status-section">
      {bannerState && (
        <div className={`spec-update-banner ${bannerState.variant}`}>
          <div className="banner-left">
            {bannerState.variant === 'success'
              ? <IconCheck size={16} className="status-check-icon" />
              : <div className={`status-dot ${bannerState.variant}`} />}
            <span className="banner-title">
              {bannerState.message}
            </span>
            {bannerState.badges && (
              <span className="banner-details">
                {bannerState.badges.modifiedCount > 0 && <StatusBadge status="warning" radius="full">{bannerState.badges.modifiedCount} modified</StatusBadge>}
                {bannerState.badges.missingCount > 0 && <StatusBadge status="danger" radius="full">{bannerState.badges.missingCount} deleted</StatusBadge>}
                {bannerState.badges.localOnlyCount > 0 && <StatusBadge status="muted" radius="full">{bannerState.badges.localOnlyCount} added</StatusBadge>}
              </span>
            )}
          </div>
          {bannerState.actions.includes('revert-all') && (
            <div className="banner-actions">
              <Button size="sm" variant="ghost" color="danger" onClick={handleRevertAllChanges}>
                Revert All to Spec
              </Button>
            </div>
          )}
        </div>
      )}

      {hasDrift && (
        <div className="sync-info-notice mt-4">
          <IconInfoCircle size={14} className="sync-info-icon" />
          <span><span className="whats-updated-title">What's tracked:</span> Changes to parameters, headers, body and auth compared to the synced spec. Your variables, scripts, tests, assertions, settings etc. are not tracked here.</span>
        </div>
      )}

      {hasDrift ? (
        <div className="mt-5">
          {/* Modified in Collection */}
          <EndpointChangeSection
            title="Modified in Collection"
            type="modified"
            endpoints={collectionDrift.modified || []}
            expandableLayout
            collectionUid={collection.uid}
            sectionKey="drift-modified"
            renderItem={(endpoint, idx) =>
              renderDriftRow(endpoint, idx, (
                <>
                  <Button size="xs" variant="ghost" onClick={() => onOpenEndpoint(endpoint.id)} title="Open in tab" icon={<IconExternalLink size={14} />}>
                    Open
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => handleResetEndpoint(endpoint)} title="Reset to spec" icon={<IconArrowBackUp size={14} />}>
                    Reset
                  </Button>
                </>
              ))}
            actions={(
              <Button
                size="xs"
                variant="outline"
                onClick={handleResetAllModified}
                title="Reset all modified endpoints to match the spec"
                icon={<IconArrowBackUp size={14} />}
              >
                Reset All
              </Button>
            )}
          />

          {/* Deleted from Collection */}
          <EndpointChangeSection
            title="Deleted from Collection"
            type="missing"
            endpoints={collectionDrift.missing || []}
            expandableLayout
            collectionUid={collection.uid}
            sectionKey="drift-missing"
            renderItem={(endpoint, idx) =>
              renderDriftRow(endpoint, idx, (
                <Button size="xs" variant="ghost" onClick={() => handleAddMissingEndpoint(endpoint)} title="Restore to collection" icon={<IconPlus size={14} />}>
                  Restore
                </Button>
              ))}
            actions={(
              <Button
                size="xs"
                variant="outline"
                onClick={handleAddAllMissing}
                title="Add all deleted endpoints back to collection"
                icon={<IconPlus size={14} />}
              >
                Restore All
              </Button>
            )}
          />

          {/* Added to Collection */}
          <EndpointChangeSection
            title="Added to Collection"
            type="local-only"
            endpoints={collectionDrift.localOnly || []}
            expandableLayout
            collectionUid={collection.uid}
            sectionKey="drift-local-only"
            renderItem={(endpoint, idx) =>
              renderDriftRow(endpoint, idx, (
                <>
                  <Button size="xs" variant="ghost" onClick={() => onOpenEndpoint(endpoint.id)} title="Open in tab" icon={<IconExternalLink size={14} />}>
                    Open
                  </Button>
                  <Button size="xs" variant="ghost" color="danger" onClick={() => handleDeleteEndpoint(endpoint)} title="Delete endpoint" icon={<IconTrash size={14} />}>
                    Delete
                  </Button>
                </>
              ))}
            actions={(
              <Button
                size="xs"
                variant="outline"
                color="danger"
                onClick={handleDeleteAllLocalOnly}
                title="Delete all locally added endpoints"
                icon={<IconTrash size={14} />}
              >
                Delete All
              </Button>
            )}
          />
        </div>
      ) : isLoading ? (
        <div className="sync-review-empty-state mt-5">
          <IconLoader2 size={40} className="empty-state-icon animate-spin" />
          <h4>Checking for updates</h4>
          <p>Comparing your collection with the last synced spec...</p>
        </div>
      ) : !hasStoredSpec ? (
        <div className="sync-review-empty-state mt-5">
          <IconAlertTriangle size={40} className="empty-state-icon" />
          <h4>{lastSyncDate ? 'Cannot track collection changes' : 'Waiting for initial sync'}</h4>
          <p>{lastSyncDate
            ? 'The last synced spec is missing. Go to the \'Spec Updates\' tab to restore it, or sync the collection if updates are available to track future changes.'
            : 'Once you sync your collection with the spec, local changes will appear here.'}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => onTabSelect('spec-updates')}>Go to Spec Updates</Button>
        </div>
      ) : (
        <div className="sync-review-empty-state mt-5">
          <IconCheck size={40} className="empty-state-icon" />
          <h4>No changes in collection</h4>
          <p>The collection endpoints match the last synced spec. Nothing to review.</p>
        </div>
      )}
      {/* Action confirmation modal */}
      {pendingAction && (
        <Modal size="sm" title={pendingAction.title} hideFooter={true} handleCancel={() => setPendingAction(null)}>
          <div className="action-confirm-modal">
            <p className="confirm-message">{pendingAction.message}</p>
            <div className="confirm-actions">
              <Button variant="ghost" onClick={() => setPendingAction(null)}>
                Cancel
              </Button>
              <Button
                color={pendingAction.type.includes('delete') ? 'danger' : 'primary'}
                onClick={confirmPendingAction}
              >
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CollectionStatusSection;
