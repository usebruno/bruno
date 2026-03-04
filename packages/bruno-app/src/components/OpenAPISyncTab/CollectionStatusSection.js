import {
  IconCheck,
  IconPlus,
  IconTrash,
  IconArrowBackUp,
  IconExternalLink,
  IconClock
} from '@tabler/icons';
import moment from 'moment';
import Button from 'ui/Button';
import StatusBadge from 'ui/StatusBadge';
import Modal from 'components/Modal';
import EndpointChangeSection from './EndpointChangeSection';
import EndpointItem from './EndpointChangeSection/EndpointItem';
import ExpandableEndpointRow from './EndpointChangeSection/ExpandableEndpointRow';
import useEndpointActions from './useEndpointActions';

const CollectionStatusSection = ({
  collection,
  collectionDrift,
  reloadDrift,
  specDrift,
  storedSpec,
  lastSyncDate,
  onOpenEndpoint
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
  const hasDrift = collectionDrift.modified?.length > 0
    || collectionDrift.missing?.length > 0
    || collectionDrift.localOnly?.length > 0;

  const renderDriftRow = (endpoint, idx, actions) => (
    <ExpandableEndpointRow
      key={endpoint.id || idx}
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

  const modifiedCount = collectionDrift.modified?.length || 0;
  const missingCount = collectionDrift.missing?.length || 0;
  const localOnlyCount = collectionDrift.localOnly?.length || 0;
  const version = specDrift?.storedVersion || storedSpec?.info?.version;

  return (
    <div className="collection-status-section">
      <div className={`spec-update-banner ${hasDrift ? 'muted' : 'success'}`}>
        <div className="banner-left">
          {hasDrift
            ? <div className="status-dot muted" />
            : <IconCheck size={16} className="status-check-icon" />}
          <span className="banner-title">
            {hasDrift ? 'Collection has changes since last sync' : 'No changes since last sync'}
            {!hasDrift && version && (
              <> &middot; <code style={{ fontStyle: 'normal' }} className="checked-text">v{version}</code></>
            )}
            {!hasDrift && lastSyncDate && (
              <span className="checked-text"> &middot; Synced {moment(lastSyncDate).fromNow()}</span>
            )}
          </span>
          {hasDrift && (
            <span className="banner-details">
              {modifiedCount > 0 && <StatusBadge status="warning" radius="full">{modifiedCount} modified</StatusBadge>}
              {missingCount > 0 && <StatusBadge status="danger" radius="full">{missingCount} deleted</StatusBadge>}
              {localOnlyCount > 0 && <StatusBadge status="muted" radius="full">{localOnlyCount} added</StatusBadge>}
            </span>
          )}
        </div>
        {hasDrift && (
          <div className="banner-actions">
            <Button size="sm" variant="ghost" color="danger" onClick={handleRevertAllChanges}>
              Revert All to Spec
            </Button>
          </div>
        )}
      </div>

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

          {/* In Sync */}
          {/* <EndpointChangeSection
            title="In Sync with Spec"
            type="in-sync"
            endpoints={collectionDrift.inSync || []}
            collectionUid={collection.uid}
            sectionKey="drift-in-sync"
            renderItem={(endpoint, idx) => (
              <EndpointItem
                key={endpoint.id || idx}
                endpoint={endpoint}
                type="in-sync"
                actions={(
                  <Button size="xs" variant="ghost" onClick={() => onOpenEndpoint(endpoint.id)} title="Open in tab" icon={<IconExternalLink size={14} />}>
                    Open
                  </Button>
                )}
              />
            )}
          /> */}
        </div>
      ) : (
        <div className="sync-review-empty-state mt-5">
          <IconCheck size={40} className="empty-state-icon" />
          <h4>No changes in collection</h4>
          <p>The collection matches the last synced spec. Nothing to review.</p>
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
