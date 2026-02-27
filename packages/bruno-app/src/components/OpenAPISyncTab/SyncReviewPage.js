import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconCheck,
  IconX,
  IconArrowRight,
  IconArrowLeft
} from '@tabler/icons';
import Button from 'ui/Button';
import ChangeSection from './ChangeSection';
import ConfirmSyncModal from './ConfirmSyncModal';
import SpecReviewPage from './SpecReviewPage';
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
  const [showSpecDiffModal, setShowSpecDiffModal] = useState(false);

  // Three-way categorization using remoteDrift (remote spec vs collection) as primary,
  // enriched by diffResult (stored spec vs remote) and collectionDrift (stored spec vs collection)
  const { addedEndpoints, specChanges, localChanges, removedEndpoints } = useMemo(() => {
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
    // Conflicts are merged into specChanges with conflict: true flag
    const specChanges = [];
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
        // Both sides changed — conflict (shown in "Updated in Spec" with conflict badge)
        specChanges.push({ ...endpoint, source: 'spec-modified', conflict: true, localAction: 'modified', specAction: 'modified' });
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

    return { addedEndpoints, specChanges, localChanges, removedEndpoints };
  }, [diffResult, remoteDrift, collectionDrift]);

  // Derived: whether any specChanges are conflicts (for expansion and unresolved counting)
  const hasConflicts = specChanges.some((ep) => ep.conflict);

  // Track decisions in Redux (persisted across navigations)
  const savedDecisions = tabUiState.reviewDecisions || {};

  // Compute defaults for any endpoints not yet in Redux
  const decisions = useMemo(() => {
    const merged = { ...savedDecisions };
    // Spec changes default to accept-incoming; conflicts default to null (must resolve)
    specChanges.forEach((ep) => {
      if (!(ep.id in merged)) {
        merged[ep.id] = ep.conflict ? null : 'accept-incoming';
      }
    });
    // Local changes default to keep-mine (preserved silently, not shown in review)
    localChanges.forEach((ep) => {
      if (!(ep.id in merged)) {
        merged[ep.id] = 'keep-mine';
      }
    });
    // Removed endpoints default to accept-incoming
    removedEndpoints.forEach((ep) => {
      if (!(ep.id in merged)) {
        merged[ep.id] = 'accept-incoming';
      }
    });
    // Added endpoints default to accept-incoming
    addedEndpoints.forEach((ep) => {
      if (!(ep.id in merged)) {
        merged[ep.id] = 'accept-incoming';
      }
    });
    return merged;
  }, [savedDecisions, specChanges, localChanges, removedEndpoints]);

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

  // Updates from Spec group - affects all three sections
  const applyAllFromSpec = () => {
    const newDecisions = {};
    specChanges.forEach((ep) => {
      newDecisions[ep.id] = 'accept-incoming';
    });
    addedEndpoints.forEach((ep) => {
      newDecisions[ep.id] = 'accept-incoming';
    });
    removedEndpoints.forEach((ep) => {
      newDecisions[ep.id] = 'accept-incoming';
    });
    dispatch(setReviewDecisions({ collectionUid, decisions: newDecisions }));
  };

  const skipAllFromSpec = () => {
    const newDecisions = {};
    specChanges.forEach((ep) => {
      newDecisions[ep.id] = 'keep-mine';
    });
    addedEndpoints.forEach((ep) => {
      newDecisions[ep.id] = 'keep-mine';
    });
    removedEndpoints.forEach((ep) => {
      newDecisions[ep.id] = 'keep-mine';
    });
    dispatch(setReviewDecisions({ collectionUid, decisions: newDecisions }));
  };

  // Derive bulk action active states
  // Updates from Spec group - checks all three sections
  const allApplyFromSpec = useMemo(() => {
    const decidable = [...specChanges, ...addedEndpoints, ...removedEndpoints];
    return decidable.length > 0
      && decidable.every((ep) => decisions[ep.id] === 'accept-incoming');
  }, [specChanges, addedEndpoints, removedEndpoints, decisions]);

  const allSkipFromSpec = useMemo(() => {
    const decidable = [...specChanges, ...addedEndpoints, ...removedEndpoints];
    return decidable.length > 0
      && decidable.every((ep) => decisions[ep.id] === 'keep-mine');
  }, [specChanges, addedEndpoints, removedEndpoints, decisions]);

  // Stats — collection-level outcome counts with endpoint lists for hover
  const updatingEndpoints = useMemo(() => [
    ...specChanges.filter((ep) => decisions[ep.id] === 'accept-incoming'),
    ...localChanges.filter((ep) => decisions[ep.id] === 'accept-incoming')
  ], [specChanges, localChanges, decisions]);
  const addingEndpoints = useMemo(
    () => addedEndpoints.filter((ep) => decisions[ep.id] === 'accept-incoming'),
    [addedEndpoints, decisions]
  );
  const removingEndpointsList = useMemo(
    () => removedEndpoints.filter((ep) => decisions[ep.id] === 'accept-incoming'),
    [removedEndpoints, decisions]
  );
  const keepingLocalEndpoints = useMemo(() =>
    specChanges.filter((ep) => ep.conflict && decisions[ep.id] === 'keep-mine'),
  [specChanges, decisions]
  );
  const retainingEndpoints = useMemo(
    () => removedEndpoints.filter((ep) => decisions[ep.id] === 'keep-mine'),
    [removedEndpoints, decisions]
  );
  const unresolvedConflicts = specChanges.filter((ep) => ep.conflict && !decisions[ep.id]).length;

  // Confirmation summary — grouped endpoint lists
  const confirmGroups = useMemo(() => {
    const groups = [];

    // Filter by accepted decisions
    const filteredAdded = addedEndpoints.filter((ep) => decisions[ep.id] === 'accept-incoming');
    const filteredSpecChanges = specChanges.filter((ep) => decisions[ep.id] === 'accept-incoming');

    if (filteredAdded.length > 0) {
      groups.push({ label: 'New endpoints to add', type: 'add', endpoints: filteredAdded });
    }

    const allUpdates = [
      ...filteredSpecChanges,
      ...localChanges.filter((ep) => decisions[ep.id] === 'accept-incoming')
    ];
    if (allUpdates.length > 0) {
      groups.push({ label: 'Endpoints to update', type: 'update', endpoints: allUpdates });
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

    // Add groups for skipped items
    const skippedAdded = addedEndpoints.filter((ep) => decisions[ep.id] === 'keep-mine');
    const skippedSpecChanges = specChanges.filter((ep) => decisions[ep.id] === 'keep-mine');

    if (skippedAdded.length > 0) {
      groups.push({ label: 'Skipped new endpoints', type: 'keep', endpoints: skippedAdded });
    }
    if (skippedSpecChanges.length > 0) {
      groups.push({ label: 'Keeping current version (skipped updates)', type: 'keep', endpoints: skippedSpecChanges });
    }

    return groups;
  }, [addedEndpoints, specChanges, localChanges, removingEndpointsList, keepingLocalEndpoints, retainingEndpoints, decisions]);

  const handleApplyClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmApply = () => {
    setShowConfirmation(false);

    // Filter based on decisions
    const filteredAddedEndpoints = addedEndpoints.filter(
      (ep) => decisions[ep.id] === 'accept-incoming'
    );
    const filteredSpecChanges = specChanges.filter(
      (ep) => !ep.conflict && decisions[ep.id] === 'accept-incoming'
    );

    // Collect "Not in Spec" endpoints where user chose to remove
    const localOnlyIds = removedEndpoints
      .filter((ep) => decisions[ep.id] === 'accept-incoming')
      .map((ep) => ep.id);

    onApplySync({
      endpointDecisions: decisions,
      removedIds: [],
      localOnlyIds,
      // Pass filtered categorized endpoints for performSync to construct the right backend diff
      newToCollection: filteredAddedEndpoints,
      specUpdates: filteredSpecChanges,
      resolvedConflicts: specChanges.filter((ep) => ep.conflict && decisions[ep.id] === 'accept-incoming'),
      localChangesToReset: localChanges.filter((ep) => decisions[ep.id] === 'accept-incoming')
    });
  };

  // Badge counts for header
  const newCount = addedEndpoints.length;
  const updatedCount = specChanges.length + localChanges.length;
  const removedCount = removedEndpoints.length;
  const totalChanges = newCount + updatedCount + removedCount;

  return (
    <div className="sync-review-page sync-mode">
      <div className="sync-review-header">
        <div className="back-link-row">
          <span className="back-link" onClick={onGoBack}>
            <IconArrowLeft size={14} />
            Back to Overview
          </span>
          {diffResult?.unifiedDiff && (
            <Button variant="outline" size="sm" onClick={() => setShowSpecDiffModal(true)}>View Spec Diff</Button>
          )}
        </div>

        <div className="title-row">
          <h3 className="review-title">Sync Changes</h3>
        </div>

        {totalChanges > 0 && (
          <div className="description-row">
            <p className="review-subtitle">
              Review each endpoint and decide whether to keep your local changes or accept the updated spec version.
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
            {/* === Updates from Spec === */}
            {(specChanges.length > 0 || addedEndpoints.length > 0 || removedEndpoints.length > 0) && (
              <div className="review-group">
                <div className="review-group-header">
                  <div className="bulk-actions">
                    <button
                      className={`bulk-btn ${allSkipFromSpec ? 'active' : ''}`}
                      onClick={skipAllFromSpec}
                    >
                      <IconX size={12} /> Skip All
                    </button>
                    <button
                      className={`bulk-btn ${allApplyFromSpec ? 'active' : ''}`}
                      onClick={applyAllFromSpec}
                    >
                      <IconCheck size={12} /> Accept All
                    </button>
                  </div>
                </div>

                <ChangeSection
                  title="Updated in Spec"
                  count={specChanges.length}
                  type="spec-modified"
                  endpoints={specChanges}
                  defaultExpanded={hasConflicts}
                  subtitle="The spec has updates for these endpoints"
                  reviewMode={true}
                  conflictCount={specChanges.filter((ep) => ep.conflict).length}
                  decisions={decisions}
                  onDecisionChange={handleDecisionChange}
                  decisionLabels={{ keep: 'Keep Current', accept: 'Update' }}
                  collectionPath={collectionPath}
                  newSpec={newSpec}
                  collectionUid={collectionUid}
                  sectionKey="review-spec-modified"
                />

                <ChangeSection
                  title="New in Spec"
                  count={addedEndpoints.length}
                  type="added"
                  endpoints={addedEndpoints}
                  defaultExpanded={false}
                  subtitle="New endpoints from the spec"
                  reviewMode={true}
                  decisions={decisions}
                  onDecisionChange={handleDecisionChange}
                  decisionLabels={{ keep: 'Skip', accept: 'Add' }}
                  collectionPath={collectionPath}
                  newSpec={newSpec}
                  collectionUid={collectionUid}
                  sectionKey="review-added"
                />

                <ChangeSection
                  title="Removed from Spec"
                  count={removedEndpoints.length}
                  type="removed"
                  endpoints={removedEndpoints}
                  defaultExpanded={false}
                  subtitle="These endpoints are in your collection but not in the spec"
                  reviewMode={true}
                  decisions={decisions}
                  onDecisionChange={handleDecisionChange}
                  decisionLabels={{ keep: 'Keep', accept: 'Delete' }}
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
              <StatWithHover className="keep" count={retainingEndpoints.length} label="retained" endpoints={retainingEndpoints} />
              <span className="stats-prefix">to your collection</span> */}
            </>
          ) : (
            <span className="stats-prefix">
              {diffResult?.storedSpecMissing ? 'Sync will update the spec file' : 'No endpoint changes to apply'}
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

      {showSpecDiffModal && (
        <SpecReviewPage
          diffResult={diffResult}
          onClose={() => setShowSpecDiffModal(false)}
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

  // Merge conflicts into specChanges (conflicts have conflict: true flag)
  const specChanges = endpoints.filter((ep) => ep.source === 'spec-modified' || ep.conflict);
  const localChanges = endpoints.filter((ep) => !ep.conflict && ep.source === 'collection-drift');
  const addedEndpoints = (diffResult?.added || []).map((ep) => ({ ...ep, id: getEndpointId(ep) }));
  const conflictIds = new Set(endpoints.filter((ep) => ep.conflict).map((ep) => ep.id));
  const removedEndpoints = (diffResult?.removed || [])
    .filter((ep) => !conflictIds.has(getEndpointId(ep)))
    .map((ep) => ({ ...ep, id: getEndpointId(ep) }));

  return { addedEndpoints, specChanges, localChanges, removedEndpoints };
}

export default SyncReviewPage;
