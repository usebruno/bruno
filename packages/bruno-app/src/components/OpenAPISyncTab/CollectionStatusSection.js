import {
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
import Help from 'components/Help';
import EndpointChangeSection from './EndpointChangeSection';
import EndpointItem from './EndpointChangeSection/EndpointItem';
import ExpandableEndpointRow from './EndpointChangeSection/ExpandableEndpointRow';
import useEndpointActions from './useEndpointActions';

const SUMMARY_CARDS = [
  { key: 'inSync', color: 'green', label: 'In Sync with Spec', tooltip: 'Endpoints that match the last synced spec exactly' },
  { key: 'modified', color: 'amber', label: 'Modified in Collection', tooltip: 'Endpoints that have been edited in your collection and now differ from the spec' },
  { key: 'missing', color: 'red', label: 'Deleted from Collection', tooltip: 'Endpoints from the spec that were removed from your collection' },
  { key: 'localOnly', color: 'muted', label: 'Added to Collection', tooltip: 'Endpoints in your collection that don\'t exist in the spec' }
];

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

  return (
    <div className="collection-status-section">
      <div className="sync-summary-title-row">
        <div>
          <div className="sync-summary-title">Collection Status</div>
          <div className="sync-summary-subtitle">Changes made to the collection since the last sync</div>
        </div>
        {lastSyncDate && (
          <StatusBadge
            status="muted"
            size="md"
            radius="full"
            variant="outline"
            leftSection={<IconClock size={13} />}
            className="last-synced-pill"
          >
            Last synced <strong>v{specDrift?.storedVersion || storedSpec?.info?.version || '?'}</strong> &middot; {moment(lastSyncDate).fromNow()}
          </StatusBadge>
        )}
      </div>
      <div className="sync-summary-cards">
        {SUMMARY_CARDS.map(({ key, color, label, tooltip }) => {
          const count = collectionDrift[key]?.length || 0;
          return (
            <div className="summary-card" key={key}>
              <span className="card-info-icon">
                <Help icon="info" size={12} placement="top" width={220}>{tooltip}</Help>
              </span>
              <div className="summary-count-row">
                <span className={`summary-count ${color}`}>{count}</span>
                <span className="summary-count-unit">{count !== 1 ? 'endpoints' : 'endpoint'}</span>
              </div>
              <div className="summary-label">{label}</div>
            </div>
          );
        })}
      </div>
      {hasDrift && (
        <div className="discard-all-row">
          <Button
            size="xs"
            variant="ghost"
            color="danger"
            onClick={handleRevertAllChanges}
          >
            Discard All Changes
          </Button>
        </div>
      )}

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
      <EndpointChangeSection
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
      />

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
