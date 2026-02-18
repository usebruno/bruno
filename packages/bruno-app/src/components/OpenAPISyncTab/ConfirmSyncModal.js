import React, { useState, useEffect, useMemo } from 'react';
import { IconChevronRight } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import MethodBadge from 'ui/MethodBadge';

const ConfirmGroup = ({ group }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`confirm-group type-${group.type}`}>
      <div className="confirm-group-header" onClick={() => setExpanded(!expanded)}>
        <IconChevronRight size={14} className={`chevron ${expanded ? 'expanded' : ''}`} />
        <span className="confirm-group-label">{group.label}</span>
        <span className="confirm-group-count">{group.endpoints.length}</span>
      </div>
      {expanded && (
        <div className="remove-endpoints-list">
          {group.endpoints.map((ep, i) => (
            <div key={ep.id || i} className="endpoint-row">
              <MethodBadge method={ep.method} />
              <span className="endpoint-path">{ep.path}</span>
              {(ep.summary || ep.name) && (
                <span className="endpoint-summary">{ep.summary || ep.name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RemovalGroup = ({ label, type, subtitle, endpoints, selectedIds, onToggle, onSelectAll, onDeselectAll }) => {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className={`confirm-group type-${type}`}>
      <div className="confirm-group-header" onClick={() => setExpanded(!expanded)}>
        <IconChevronRight size={14} className={`chevron ${expanded ? 'expanded' : ''}`} />
        <span className="confirm-group-label">{label}</span>
        <span className="confirm-group-count">{endpoints.length}</span>
        {subtitle && <span className="confirm-group-subtitle">{subtitle}</span>}
      </div>
      {expanded && (
        <div className="confirm-group-body">
          <div className="removal-controls">
            <span className="removal-count">
              {selectedIds.size} of {endpoints.length} selected for removal
            </span>
            <div className="removal-actions">
              <button className="text-link" onClick={onSelectAll}>
                Select all
              </button>
              <span className="removal-separator">|</span>
              <button className="text-link" onClick={onDeselectAll}>
                Deselect all
              </button>
            </div>
          </div>
          <div className="remove-endpoints-list">
            {endpoints.map((endpoint) => (
              <label key={endpoint.id} className="endpoint-row selectable">
                <input
                  type="checkbox"
                  checked={selectedIds.has(endpoint.id)}
                  onChange={() => onToggle(endpoint.id)}
                />
                <MethodBadge method={endpoint.method} />
                <span className="endpoint-path">{endpoint.path}</span>
                {(endpoint.summary || endpoint.name) && (
                  <span className="endpoint-summary">{endpoint.summary || endpoint.name}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ConfirmSyncModal = ({ diffResult, remoteDrift, groups, onCancel, onSync, isSyncing }) => {
  const [selectedRemoved, setSelectedRemoved] = useState(new Set());

  // When `groups` is provided, render summary-only mode (no removal selection)
  const summaryOnly = !!groups;

  // Memoize endpoint arrays to prevent infinite re-render from new [] references
  const addedEndpoints = useMemo(() => remoteDrift?.missing || diffResult?.added || [], [remoteDrift?.missing, diffResult?.added]);
  const modifiedEndpoints = useMemo(() => remoteDrift?.modified || diffResult?.modified || [], [remoteDrift?.modified, diffResult?.modified]);
  const removedEndpoints = useMemo(() => remoteDrift?.localOnly || diffResult?.removed || [], [remoteDrift?.localOnly, diffResult?.removed]);

  // Initialize: removed endpoints selected by default
  useEffect(() => {
    if (summaryOnly) return;
    setSelectedRemoved(new Set(removedEndpoints.map((ep) => ep.id)));
  }, [summaryOnly, removedEndpoints]);

  const toggleRemoved = (id) => {
    setSelectedRemoved((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllRemoved = () => setSelectedRemoved(new Set(removedEndpoints.map((ep) => ep.id)));
  const deselectAllRemoved = () => setSelectedRemoved(new Set());

  const hasRemovedEndpoints = !summaryOnly && removedEndpoints.length > 0;
  const hasNoEndpointChanges = summaryOnly
    ? groups.length === 0
    : addedEndpoints.length === 0 && modifiedEndpoints.length === 0 && removedEndpoints.length === 0;

  // Build summary groups for added/modified (read-only), or use provided groups
  const summaryGroups = groups || (() => {
    const computed = [];
    if (addedEndpoints.length > 0) {
      computed.push({ label: 'New endpoints to add', type: 'add', endpoints: addedEndpoints });
    }
    if (modifiedEndpoints.length > 0) {
      computed.push({ label: 'Endpoints to update', type: 'update', endpoints: modifiedEndpoints });
    }
    return computed;
  })();

  const handleSync = () => {
    if (summaryOnly) {
      onSync();
    } else {
      // When remoteDrift is available, "removed" endpoints are actually localOnly (in collection, not in spec)
      // and should be passed as localOnlyIds for the backend to handle via localOnlyToRemove
      const selectedIds = Array.from(selectedRemoved);
      if (remoteDrift) {
        onSync({
          removedIds: [],
          localOnlyIds: selectedIds
        });
      } else {
        onSync({
          removedIds: selectedIds,
          localOnlyIds: []
        });
      }
    }
  };

  return (
    <Modal
      size="md"
      title="Confirm Sync"
      handleCancel={onCancel}
      hideFooter={true}
    >
      <div className="sync-confirm-modal">
        {hasNoEndpointChanges ? (
          <>
            <p className="sync-confirm-description">
              {diffResult?.storedSpecMissing
                ? 'Your collection is already in sync with the remote spec. Syncing will download the remote spec and restore the local spec file.'
                : 'Your collection is already in sync with the remote spec. Syncing will update the local spec file to match the latest remote version.'}
            </p>
          </>
        ) : (
          <>
            <p className="sync-confirm-description">
              The following changes will be applied to your collection. This action cannot be undone. Are you sure you want to proceed?
            </p>

            <div className="sync-confirm-groups">
              {summaryGroups.map((group, idx) => (
                <ConfirmGroup key={idx} group={group} />
              ))}

              {hasRemovedEndpoints && (
                <RemovalGroup
                  label="Endpoints to delete"
                  subtitle="— deselect to keep"
                  type="remove"
                  endpoints={removedEndpoints}
                  selectedIds={selectedRemoved}
                  onToggle={toggleRemoved}
                  onSelectAll={selectAllRemoved}
                  onDeselectAll={deselectAllRemoved}
                />
              )}
            </div>
          </>
        )}

        <div className="sync-confirm-actions">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSync} loading={isSyncing} disabled={isSyncing}>
            {hasNoEndpointChanges
              ? (diffResult?.storedSpecMissing ? 'Restore Spec File' : 'Update Spec File')
              : 'Confirm & Sync Collection'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmSyncModal;
