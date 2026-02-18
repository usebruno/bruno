import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconCheck,
  IconX,
  IconArrowRight,
  IconArrowLeft,
  IconAlertTriangle,
  IconRefresh,
  IconPencil,
  IconPlus,
  IconTrash
} from '@tabler/icons';
import Button from 'ui/Button';
import ChangeSection from './ChangeSection';
import ConfirmSyncModal from './ConfirmSyncModal';
import { setReviewDecision, setReviewDecisions, selectTabUiState } from 'providers/ReduxStore/slices/openapi-sync';
import MethodBadge from 'ui/MethodBadge';

/**
 * Normalize an endpoint ID, matching the backend normalizePath logic:
 * - Convert {param} to :param
 * - Collapse duplicate slashes
 * - Remove trailing slash
 */
const getEndpointId = (ep) => {
  if (ep.id) return ep.id;
  const normalizedPath = (ep.path || '')
    .replace(/{([^}]+)}/g, ':$1')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
  return `${(ep.method || 'GET').toUpperCase()}:${normalizedPath}`;
};

const StatWithHover = ({ className, count, label, endpoints }) => {
  const [hoverStyle, setHoverStyle] = useState(null);
  const ref = useRef(null);

  if (count === 0) return null;

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHoverStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left + rect.width / 2
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverStyle(null);
  };

  return (
    <span
      className={`stat ${className}`}
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {count} {label}
      {hoverStyle && (
        <div className="stat-hover-card" style={hoverStyle}>
          <div className="stat-hover-list">
            {endpoints.map((ep, idx) => (
              <div key={ep.id || idx} className="stat-hover-item">
                <MethodBadge method={ep.method} size="sm" />
                <span className="stat-hover-path">{ep.path}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
};

const SyncReviewPage = ({
  diffResult,
  remoteDrift,
  collectionDrift,
  collectionPath,
  collectionUid,
  newSpec,
  isSyncing,
  onGoBack,
  onApplySync
}) => {
  const dispatch = useDispatch();
  const tabUiState = useSelector(selectTabUiState(collectionUid));
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Three-way categorization using remoteDrift (remote spec vs collection) as primary,
  // enriched by diffResult (stored spec vs remote) and collectionDrift (stored spec vs collection)
  const { addedEndpoints, specChanges, conflicts, localChanges, removedEndpoints } = useMemo(() => {
    // Fallback: when remoteDrift is not available, use legacy diffResult-based logic
    if (!remoteDrift) {
      return computeLegacyCategories(diffResult, collectionDrift, getEndpointId);
    }

    // Build lookup sets for three-way merge enrichment
    const specModifiedIds = new Set((diffResult?.modified || []).map((ep) => getEndpointId(ep)));
    const localModifiedIds = new Set((collectionDrift?.modified || []).map((ep) => getEndpointId(ep)));
    const noStoredSpec = collectionDrift?.noStoredSpec;

    // "New in Spec" — in remote spec, not in collection
    const addedEndpoints = (remoteDrift.missing || []).map((ep) => ({ ...ep, id: getEndpointId(ep) }));

    // Sub-categorize remoteDrift.modified using three-way merge
    const specChanges = [];
    const conflicts = [];
    const localChanges = [];

    (remoteDrift.modified || []).forEach((ep) => {
      const id = getEndpointId(ep);
      const endpoint = { ...ep, id };

      if (noStoredSpec) {
        // No merge base — can't distinguish who changed what. Show as spec update requiring review.
        specChanges.push({ ...endpoint, source: 'spec-modified', specAction: 'modified' });
        return;
      }

      const specChanged = specModifiedIds.has(id);
      const localChanged = localModifiedIds.has(id);

      if (specChanged && localChanged) {
        // Both sides changed — conflict
        conflicts.push({ ...endpoint, source: 'spec-modified', conflict: true, localAction: 'modified', specAction: 'modified' });
      } else if (specChanged && !localChanged) {
        // Only spec changed — safe to auto-apply
        specChanges.push({ ...endpoint, source: 'spec-modified', specAction: 'modified' });
      } else if (!specChanged && localChanged) {
        // Only local changed — user modification, spec didn't change
        localChanges.push({ ...endpoint, source: 'collection-drift', localAction: 'modified' });
      } else {
        // Neither changed in stored-spec comparisons but differs in remote-vs-collection
        // This happens due to sensitivity differences between comparisons. Treat as spec update.
        specChanges.push({ ...endpoint, source: 'spec-modified', specAction: 'modified' });
      }
    });

    // "Removed from Spec" — in collection, not in remote spec
    const removedEndpoints = (remoteDrift.localOnly || []).map((ep) => ({ ...ep, id: getEndpointId(ep) }));

    return { addedEndpoints, specChanges, conflicts, localChanges, removedEndpoints };
  }, [diffResult, remoteDrift, collectionDrift]);

  // Track decisions in Redux (persisted across navigations)
  const savedDecisions = tabUiState.reviewDecisions || {};

  // Compute defaults for any endpoints not yet in Redux
  const decisions = useMemo(() => {
    const merged = { ...savedDecisions };
    // Spec changes default to accept-incoming
    specChanges.forEach((ep) => {
      if (!(ep.id in merged)) {
        merged[ep.id] = 'accept-incoming';
      }
    });
    // Conflicts default to null (must resolve)
    conflicts.forEach((ep) => {
      if (!(ep.id in merged)) {
        merged[ep.id] = null;
      }
    });
    // Local changes default to keep-mine
    localChanges.forEach((ep) => {
      if (!(ep.id in merged)) {
        merged[ep.id] = 'keep-mine';
      }
    });
    // Removed endpoints default to keep-mine (safe default)
    removedEndpoints.forEach((ep) => {
      if (!(ep.id in merged)) {
        merged[ep.id] = 'keep-mine';
      }
    });
    return merged;
  }, [savedDecisions, specChanges, conflicts, localChanges, removedEndpoints]);

  // Sync computed defaults back to Redux when they differ from saved state
  useEffect(() => {
    const hasNewDefaults = Object.keys(decisions).some((id) => !(id in savedDecisions));
    if (hasNewDefaults) {
      dispatch(setReviewDecisions({ collectionUid, decisions }));
    }
  }, [decisions, savedDecisions, collectionUid, dispatch]);

  const handleDecisionChange = (endpointId, decision) => {
    dispatch(setReviewDecision({ collectionUid, endpointId, decision }));
  };

  const acceptAllIncoming = () => {
    const newDecisions = {};
    conflicts.forEach((ep) => {
      newDecisions[ep.id] = 'accept-incoming';
    });
    localChanges.forEach((ep) => {
      newDecisions[ep.id] = 'accept-incoming';
    });
    removedEndpoints.forEach((ep) => {
      newDecisions[ep.id] = 'accept-incoming';
    });
    dispatch(setReviewDecisions({ collectionUid, decisions: newDecisions }));
  };

  const keepAllMine = () => {
    const newDecisions = {};
    conflicts.forEach((ep) => {
      newDecisions[ep.id] = 'keep-mine';
    });
    localChanges.forEach((ep) => {
      newDecisions[ep.id] = 'keep-mine';
    });
    removedEndpoints.forEach((ep) => {
      newDecisions[ep.id] = 'keep-mine';
    });
    dispatch(setReviewDecisions({ collectionUid, decisions: newDecisions }));
  };

  // Derive bulk action active states
  const allAcceptIncoming = useMemo(() => {
    const decidable = [...conflicts, ...localChanges, ...removedEndpoints];
    return decidable.length > 0
      && decidable.every((ep) => decisions[ep.id] === 'accept-incoming');
  }, [conflicts, localChanges, removedEndpoints, decisions]);

  const allKeepMine = useMemo(() => {
    const decidable = [...conflicts, ...localChanges, ...removedEndpoints];
    return decidable.length > 0
      && decidable.every((ep) => decisions[ep.id] === 'keep-mine');
  }, [conflicts, localChanges, removedEndpoints, decisions]);

  // Stats — collection-level outcome counts with endpoint lists for hover
  const updatingEndpoints = useMemo(() => [
    ...specChanges.filter((ep) => decisions[ep.id] === 'accept-incoming'),
    ...conflicts.filter((ep) => decisions[ep.id] === 'accept-incoming'),
    ...localChanges.filter((ep) => decisions[ep.id] === 'accept-incoming')
  ], [specChanges, conflicts, localChanges, decisions]);
  const addingEndpoints = addedEndpoints;
  const removingEndpointsList = useMemo(
    () => removedEndpoints.filter((ep) => decisions[ep.id] === 'accept-incoming'),
    [removedEndpoints, decisions]
  );
  const keepingLocalEndpoints = useMemo(() => [
    ...localChanges.filter((ep) => decisions[ep.id] === 'keep-mine'),
    ...conflicts.filter((ep) => decisions[ep.id] === 'keep-mine')
  ], [localChanges, conflicts, decisions]);
  const retainingEndpoints = useMemo(
    () => removedEndpoints.filter((ep) => decisions[ep.id] === 'keep-mine'),
    [removedEndpoints, decisions]
  );
  const unresolvedConflicts = conflicts.filter((ep) => !decisions[ep.id]).length;

  // Confirmation summary — grouped endpoint lists
  const confirmGroups = useMemo(() => {
    const groups = [];
    if (addingEndpoints.length > 0) {
      groups.push({ label: 'New endpoints to add', type: 'add', endpoints: addingEndpoints });
    }
    if (updatingEndpoints.length > 0) {
      groups.push({ label: 'Endpoints to update', type: 'update', endpoints: updatingEndpoints });
    }
    if (removingEndpointsList.length > 0) {
      groups.push({ label: 'Endpoints to delete', type: 'remove', endpoints: removingEndpointsList });
    }
    if (keepingLocalEndpoints.length > 0) {
      groups.push({ label: 'Keeping local version', type: 'keep', endpoints: keepingLocalEndpoints });
    }
    if (retainingEndpoints.length > 0) {
      groups.push({ label: 'Retaining removed endpoints', type: 'keep', endpoints: retainingEndpoints });
    }
    return groups;
  }, [addingEndpoints, updatingEndpoints, removingEndpointsList, keepingLocalEndpoints, retainingEndpoints]);

  const handleApplyClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmApply = () => {
    setShowConfirmation(false);

    // Collect "Not in Spec" endpoints where user chose to remove
    const localOnlyIds = removedEndpoints
      .filter((ep) => decisions[ep.id] === 'accept-incoming')
      .map((ep) => ep.id);

    onApplySync({
      endpointDecisions: decisions,
      removedIds: [],
      localOnlyIds,
      // Pass categorized endpoints for performSync to construct the right backend diff
      newToCollection: addedEndpoints,
      specUpdates: specChanges,
      resolvedConflicts: conflicts.filter((ep) => decisions[ep.id] === 'accept-incoming'),
      localChangesToReset: localChanges.filter((ep) => decisions[ep.id] === 'accept-incoming')
    });
  };

  // Badge counts for header
  const newCount = addedEndpoints.length;
  const updatedCount = specChanges.length + conflicts.length + localChanges.length;
  const removedCount = removedEndpoints.length;
  const totalChanges = newCount + updatedCount + removedCount;

  return (
    <div className="sync-review-page">
      <div className="sync-review-header">
        <span className="back-link" onClick={onGoBack}>
          <IconArrowLeft size={14} />
          Back to Overview
        </span>

        <div className="title-row">
          <h3 className="review-title">Sync Changes</h3>
          {/* {totalChanges > 0 && (
            <div className="review-badges">
              <div className="badge-row">
                {newCount > 0 && (
                  <span className="context-pill added">New in spec: {newCount}</span>
                )}
                {updatedCount > 0 && (
                  <span className="context-pill spec">Updated in spec: {updatedCount}</span>
                )}
                {removedCount > 0 && (
                  <span className="context-pill removed">Removed from spec: {removedCount}</span>
                )}
              </div>
            </div>
          )} */}
        </div>

        {totalChanges > 0 && (
          <div className="description-row">
            <p className="review-subtitle">
              Review each endpoint and decide whether to keep your local changes or accept the incoming spec version.
            </p>
            {/* <div className="review-badges">
              {(conflicts.length > 0 || localChanges.length > 0) && (
                <div className="badge-row">
                  {conflicts.length > 0 && (
                    <span className="context-pill conflict">Conflicts: {conflicts.length}</span>
                  )}
                  {localChanges.length > 0 && (
                    <span className="context-pill drift">Modified locally: {localChanges.length}</span>
                  )}
                </div>
              )}
            </div> */}
          </div>
        )}

      </div>

      <div className="sync-review-body">
        {totalChanges === 0 ? (
          <div className="sync-review-empty-state">
            <IconCheck size={40} className="empty-state-icon" />
            <h4>Your collection is already in sync</h4>
            <p>
              All endpoints in your collection match the remote spec. No changes are needed.
              {diffResult?.storedSpecMissing && (
                <> Click <strong>Sync Collection</strong> below to restore the local spec file.</>
              )}
            </p>
          </div>
        ) : (
          <div className="endpoints-review-sections">
            {/* === Incoming from Spec === */}
            {(specChanges.length > 0 || addedEndpoints.length > 0) && (
              <div className="review-group">
                {/* <h4 className="review-group-title">Incoming from Spec</h4> */}

                <ChangeSection
                  title="Updated in Spec"
                  // icon={IconRefresh}
                  count={specChanges.length}
                  type="spec-modified"
                  endpoints={specChanges}
                  defaultExpanded={true}
                  subtitle="These endpoints will be updated in your collection on sync"
                  expandable={true}
                  collectionPath={collectionPath}
                  newSpec={newSpec}
                  collectionUid={collectionUid}
                  sectionKey="review-spec-modified"
                />

                <ChangeSection
                  title="New in Spec"
                  // icon={IconPlus}
                  count={addedEndpoints.length}
                  type="added"
                  endpoints={addedEndpoints}
                  defaultExpanded={false}
                  subtitle="These endpoints will be added to your collection on sync"
                  expandable={true}
                  collectionPath={collectionPath}
                  newSpec={newSpec}
                  collectionUid={collectionUid}
                  sectionKey="review-added"
                />
              </div>
            )}

            {/* === Needs Your Decision === */}
            {(conflicts.length > 0 || localChanges.length > 0 || removedEndpoints.length > 0) && (
              <div className="review-group">
                <div className="review-group-header">
                  <h4 className="review-group-title">Needs Your Decision</h4>
                  <div className="bulk-actions">
                    <button className={`bulk-btn ${allAcceptIncoming ? 'active' : ''}`} onClick={acceptAllIncoming}>
                      <IconCheck size={12} /> Accept All From Spec
                    </button>
                    <button className={`bulk-btn ${allKeepMine ? 'active' : ''}`} onClick={keepAllMine}>
                      <IconX size={12} /> Keep All Mine
                    </button>
                  </div>
                </div>

                <ChangeSection
                  title="Conflicts"
                  // icon={IconAlertTriangle}
                  count={conflicts.length}
                  type="conflict"
                  endpoints={conflicts}
                  defaultExpanded={true}
                  subtitle="You modified these endpoints locally and the spec has updates too — resolve before syncing"
                  reviewMode={true}
                  showSourceBadges={true}
                  decisions={decisions}
                  onDecisionChange={handleDecisionChange}
                  collectionPath={collectionPath}
                  newSpec={newSpec}
                  collectionUid={collectionUid}
                  sectionKey="review-conflicts"
                />

                <ChangeSection
                  title="Modified Locally"
                  // icon={IconPencil}
                  count={localChanges.length}
                  type="collection-drift"
                  endpoints={localChanges}
                  defaultExpanded={true}
                  subtitle="You modified these endpoints locally — decide whether to keep or reset"
                  reviewMode={true}
                  decisions={decisions}
                  onDecisionChange={handleDecisionChange}
                  decisionLabels={{ keep: 'Keep Mine', accept: 'Reset to Spec' }}
                  collectionPath={collectionPath}
                  newSpec={newSpec}
                  collectionUid={collectionUid}
                  sectionKey="review-local-changes"
                />

                <ChangeSection
                  title="Removed from Spec"
                  // icon={IconTrash}
                  count={removedEndpoints.length}
                  type="removed"
                  endpoints={removedEndpoints}
                  defaultExpanded={false}
                  subtitle="These endpoints are in your collection but not in the remote spec"
                  reviewMode={true}
                  decisions={decisions}
                  onDecisionChange={handleDecisionChange}
                  decisionLabels={{ keep: 'Keep', accept: 'Remove' }}
                  collectionPath={collectionPath}
                  newSpec={newSpec}
                  collectionUid={collectionUid}
                  sectionKey="review-removed"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sync-review-bottom-bar">
        <div className="bar-stats">
          {totalChanges > 0 ? (
            <>
              {/* <span className="stats-prefix">On sync:</span>
              <StatWithHover className="add" count={addingEndpoints.length} label="new added" endpoints={addingEndpoints} />
              <StatWithHover className="update" count={updatingEndpoints.length} label="updated" endpoints={updatingEndpoints} />
              <StatWithHover className="remove" count={removingEndpointsList.length} label="deleted" endpoints={removingEndpointsList} />
              <StatWithHover className="keep" count={keepingLocalEndpoints.length} label="kept local" endpoints={keepingLocalEndpoints} />
              <StatWithHover className="keep" count={retainingEndpoints.length} label="retained" endpoints={retainingEndpoints} /> */}
            </>
          ) : (
            <span className="stats-prefix">
              {diffResult?.storedSpecMissing ? 'Sync will restore the local spec file' : 'No endpoint changes to apply'}
            </span>
          )}
        </div>
        <div className="bar-actions">
          <Button variant="ghost" onClick={onGoBack}>Go Back</Button>
          <Button
            onClick={totalChanges === 0 ? handleConfirmApply : handleApplyClick}
            disabled={unresolvedConflicts > 0 || isSyncing}
            loading={isSyncing}
          >
            {unresolvedConflicts > 0
              ? `Resolve ${unresolvedConflicts} conflict${unresolvedConflicts !== 1 ? 's' : ''}`
              : totalChanges === 0
                ? (diffResult?.storedSpecMissing ? 'Update Spec File' : 'Sync Collection')
                : 'Sync Collection'}
            {unresolvedConflicts === 0 && <IconArrowRight size={14} className="ml-1" />}
          </Button>
        </div>
      </div>

      {showConfirmation && (
        <ConfirmSyncModal
          groups={confirmGroups}
          onCancel={() => setShowConfirmation(false)}
          onSync={handleConfirmApply}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
};

// Legacy categorization fallback when remoteDrift is not available
function computeLegacyCategories(diffResult, collectionDrift, getEndpointId) {
  const endpoints = [];
  const seenIds = new Set();
  const specModifiedIds = new Set();
  const specRemovedIds = new Set();
  const driftIds = new Set();

  if (diffResult?.removed?.length > 0) {
    diffResult.removed.forEach((ep) => {
      specRemovedIds.add(getEndpointId(ep));
    });
  }

  if (diffResult?.modified?.length > 0) {
    diffResult.modified.forEach((ep) => {
      const id = getEndpointId(ep);
      specModifiedIds.add(id);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        endpoints.push({ ...ep, source: 'spec-modified', id, specAction: 'modified' });
      }
    });
  }

  if (collectionDrift?.modified?.length > 0) {
    collectionDrift.modified.forEach((ep) => {
      const id = getEndpointId(ep);
      driftIds.add(id);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        if (specRemovedIds.has(id)) {
          endpoints.push({ ...ep, source: 'collection-drift', id, conflict: true, removedFromSpec: true, localAction: 'modified', specAction: 'removed' });
        } else {
          endpoints.push({ ...ep, source: 'collection-drift', id, localAction: 'modified' });
        }
      } else {
        const existing = endpoints.find((item) => item.id === id);
        if (existing) {
          existing.conflict = true;
          existing.localAction = 'modified';
        }
      }
    });
  }

  const modifiedConflictIds = new Set([...specModifiedIds].filter((id) => driftIds.has(id)));
  endpoints.forEach((endpoint) => {
    if (modifiedConflictIds.has(endpoint.id)) {
      endpoint.conflict = true;
    }
  });

  const conflicts = endpoints.filter((ep) => ep.conflict);
  const specChanges = endpoints.filter((ep) => !ep.conflict && ep.source === 'spec-modified');
  const localChanges = endpoints.filter((ep) => !ep.conflict && ep.source === 'collection-drift');
  const addedEndpoints = (diffResult?.added || []).map((ep) => ({ ...ep, id: getEndpointId(ep) }));
  const conflictIds = new Set(conflicts.map((ep) => ep.id));
  const removedEndpoints = (diffResult?.removed || [])
    .filter((ep) => !conflictIds.has(getEndpointId(ep)))
    .map((ep) => ({ ...ep, id: getEndpointId(ep) }));

  return { addedEndpoints, specChanges, conflicts, localChanges, removedEndpoints };
}

export default SyncReviewPage;
