import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconCheck,
  IconX,
  IconArrowRight,
  IconArrowLeft
} from '@tabler/icons';
import Button from 'ui/Button';
import StatusBadge from 'ui/StatusBadge';
import EndpointChangeSection from './EndpointChangeSection';
import ExpandableEndpointRow from './EndpointChangeSection/ExpandableEndpointRow';
import ConfirmSyncModal from './ConfirmSyncModal';
import SpecDiffModal from './SpecDiffModal';
import Help from 'components/Help';
import { setReviewDecision, setReviewDecisions, selectTabUiState } from 'providers/ReduxStore/slices/openapi-sync';

/**
 * Categorize remoteDrift endpoints using three-way merge.
 * Uses specDrift and collectionDrift to determine who changed each modified endpoint.
 *
 * Returns:
 *  - specAddedEndpoints: new in spec, not yet in collection
 *  - specUpdatedEndpoints: modified in spec (includes conflicts where both sides changed)
 *  - localUpdatedEndpoints: modified only in the collection (spec didn't change)
 *  - specRemovedEndpoints: removed from spec, still in collection
 */
const categorizeEndpoints = (remoteDrift, specDrift, collectionDrift) => {
  const specAddedEndpoints = remoteDrift.missing || [];
  const specRemovedEndpoints = remoteDrift.localOnly || [];

  // Build lookup sets to determine who changed each modified endpoint
  const specModifiedIds = new Set((specDrift?.modified || []).map((ep) => ep.id));
  const localModifiedIds = new Set((collectionDrift?.modified || []).map((ep) => ep.id));
  const noMergeBase = collectionDrift?.noStoredSpec;

  const specUpdatedEndpoints = [];
  const localUpdatedEndpoints = [];

  (remoteDrift.modified || []).forEach((ep) => {
    // When there's no merge base (noStoredSpec), we can't tell who changed what — treat as spec update
    const specChanged = !noMergeBase && specModifiedIds.has(ep.id);
    const localChanged = !noMergeBase && localModifiedIds.has(ep.id);

    if (!specChanged && localChanged) {
      // Only local changed — user modification, spec didn't change
      localUpdatedEndpoints.push({
        ...ep,
        source: 'collection-drift',
        localAction: 'modified'
      });
    } else {
      // Spec changed, both changed (conflict), no merge base, or sensitivity mismatch
      specUpdatedEndpoints.push({
        ...ep,
        source: 'spec-modified',
        specAction: 'modified',
        ...(specChanged && localChanged && { conflict: true, localAction: 'modified' })
      });
    }
  });

  return { specAddedEndpoints, specUpdatedEndpoints, localUpdatedEndpoints, specRemovedEndpoints };
};

const SyncReviewPage = ({
  specDrift,
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

  const { specAddedEndpoints, specUpdatedEndpoints, localUpdatedEndpoints, specRemovedEndpoints } = useMemo(() => {
    if (!remoteDrift) {
      return { specAddedEndpoints: [], specUpdatedEndpoints: [], localUpdatedEndpoints: [], specRemovedEndpoints: [] };
    }
    return categorizeEndpoints(remoteDrift, specDrift, collectionDrift);
  }, [specDrift, remoteDrift, collectionDrift]);

  const conflictCount = specUpdatedEndpoints.filter((ep) => ep.conflict).length;
  const hasConflicts = conflictCount > 0;

  // Track decisions in Redux (persisted across navigations)
  const savedDecisions = tabUiState.reviewDecisions || {};

  // Compute defaults for any endpoints not yet in Redux
  const decisions = useMemo(() => {
    const merged = { ...savedDecisions };
    // Spec changes: accept-incoming by default, null for conflicts (must resolve manually)
    specUpdatedEndpoints.forEach((ep) => {
      if (!(ep.id in merged)) merged[ep.id] = ep.conflict ? null : 'accept-incoming';
    });
    // Local changes: keep-mine (preserved silently, not shown in review)
    localUpdatedEndpoints.forEach((ep) => {
      if (!(ep.id in merged)) merged[ep.id] = 'keep-mine';
    });
    // Added + removed endpoints: accept-incoming
    [...specAddedEndpoints, ...specRemovedEndpoints].forEach((ep) => {
      if (!(ep.id in merged)) merged[ep.id] = 'accept-incoming';
    });
    return merged;
  }, [savedDecisions, specUpdatedEndpoints, localUpdatedEndpoints, specRemovedEndpoints, specAddedEndpoints]);

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

  // Bulk actions — all spec-driven sections
  const decidableEndpoints = useMemo(() => {
    return [...specUpdatedEndpoints, ...specAddedEndpoints, ...specRemovedEndpoints];
  }, [specUpdatedEndpoints, specAddedEndpoints, specRemovedEndpoints]);

  const setBulkDecision = (decision) => {
    const newDecisions = {};
    decidableEndpoints.forEach((ep) => { newDecisions[ep.id] = decision; });
    dispatch(setReviewDecisions({ collectionUid, decisions: newDecisions }));
  };

  const allAccepted = decidableEndpoints.length > 0
    && decidableEndpoints.every((ep) => decisions[ep.id] === 'accept-incoming');
  const allSkipped = decidableEndpoints.length > 0
    && decidableEndpoints.every((ep) => decisions[ep.id] === 'keep-mine');

  const unresolvedConflicts = specUpdatedEndpoints.filter((ep) => ep.conflict && !decisions[ep.id]).length;

  // Confirmation summary — grouped endpoint lists
  const confirmGroups = useMemo(() => {
    const groups = [];
    const addGroup = (label, type, endpoints) => {
      if (endpoints.length > 0) groups.push({ label, type, endpoints });
    };

    const isAccepted = (ep) => decisions[ep.id] === 'accept-incoming';
    const isSkipped = (ep) => decisions[ep.id] === 'keep-mine';

    // Accepted — changes that will be applied
    addGroup('New endpoints to add', 'add', specAddedEndpoints.filter(isAccepted));
    addGroup('Endpoints to update', 'update', [
      ...specUpdatedEndpoints.filter(isAccepted),
      ...localUpdatedEndpoints.filter(isAccepted)
    ]);
    addGroup('Endpoints to delete', 'remove', specRemovedEndpoints.filter(isAccepted));

    // Skipped — changes that will be preserved as-is
    addGroup('Keeping local version', 'keep', specUpdatedEndpoints.filter((ep) => ep.conflict && isSkipped(ep)));
    addGroup('Retaining removed endpoints', 'keep', specRemovedEndpoints.filter(isSkipped));
    addGroup('Skipped new endpoints', 'keep', specAddedEndpoints.filter(isSkipped));
    addGroup('Keeping current version (skipped updates)', 'keep', specUpdatedEndpoints.filter(isSkipped));

    return groups;
  }, [specAddedEndpoints, specUpdatedEndpoints, localUpdatedEndpoints, specRemovedEndpoints, decisions]);

  const handleConfirmApply = () => {
    setShowConfirmation(false);

    // Filter based on decisions
    const filteredAddedEndpoints = specAddedEndpoints.filter(
      (ep) => decisions[ep.id] === 'accept-incoming'
    );
    const filteredSpecChanges = specUpdatedEndpoints.filter(
      (ep) => !ep.conflict && decisions[ep.id] === 'accept-incoming'
    );

    // Collect "Not in Spec" endpoints where user chose to remove
    const localOnlyIds = specRemovedEndpoints
      .filter((ep) => decisions[ep.id] === 'accept-incoming')
      .map((ep) => ep.id);

    onApplySync({
      endpointDecisions: decisions,
      removedIds: [],
      localOnlyIds,
      // Pass filtered categorized endpoints for performSync to construct the right backend diff
      newToCollection: filteredAddedEndpoints,
      specUpdates: filteredSpecChanges,
      resolvedConflicts: specUpdatedEndpoints.filter((ep) => ep.conflict && decisions[ep.id] === 'accept-incoming'),
      localChangesToReset: localUpdatedEndpoints.filter((ep) => decisions[ep.id] === 'accept-incoming')
    });
  };

  const totalChanges = specAddedEndpoints.length + specUpdatedEndpoints.length + localUpdatedEndpoints.length + specRemovedEndpoints.length;

  const buttonLabel = unresolvedConflicts > 0
    ? `Resolve ${unresolvedConflicts} conflict${unresolvedConflicts !== 1 ? 's' : ''}`
    : totalChanges === 0 && specDrift?.storedSpecMissing
      ? 'Update Spec File'
      : 'Sync Collection';

  return (
    <div className="sync-review-page sync-mode">
      <div className="sync-review-header">
        <div className="back-link-row">
          <span className="back-link" onClick={onGoBack}>
            <IconArrowLeft size={14} />
            Back to Overview
          </span>
          {specDrift?.unifiedDiff && (
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
              {specDrift?.storedSpecMissing && (
                <> Click <strong>Sync Collection</strong> below to restore the local spec file.</>
              )}
            </p>
          </div>
        ) : (
          <div className="endpoints-review-sections">
            {/* === Updates from Spec === */}
            {decidableEndpoints.length > 0 && (
              <div className="review-group">
                <div className="review-group-header">
                  <div className="bulk-actions">
                    <button
                      className={`bulk-btn ${allSkipped ? 'active' : ''}`}
                      onClick={() => setBulkDecision('keep-mine')}
                    >
                      <IconX size={12} /> Skip All
                    </button>
                    <button
                      className={`bulk-btn ${allAccepted ? 'active' : ''}`}
                      onClick={() => setBulkDecision('accept-incoming')}
                    >
                      <IconCheck size={12} /> Accept All
                    </button>
                  </div>
                </div>

                <EndpointChangeSection
                  title="Updated in Spec"
                  type="spec-modified"
                  endpoints={specUpdatedEndpoints}
                  defaultExpanded={hasConflicts}
                  expandableLayout
                  subtitle="The spec has updates for these endpoints"
                  headerExtra={conflictCount > 0 ? (
                    <StatusBadge
                      status="danger"
                      rightSection={(
                        <Help icon="info" size={11} placement="bottom" width={250}>
                          {`This section has ${conflictCount} endpoint${conflictCount === 1 ? '' : 's'} modified in both the spec and your collection. Expand to review and resolve.`}
                        </Help>
                      )}
                    >
                      {conflictCount} {conflictCount === 1 ? 'Conflict' : 'Conflicts'}
                    </StatusBadge>
                  ) : null}
                  collectionUid={collectionUid}
                  sectionKey="review-spec-modified"
                  renderItem={(endpoint, idx) => (
                    <ExpandableEndpointRow
                      key={endpoint.id || idx}
                      endpoint={endpoint}
                      decision={decisions?.[endpoint.id]}
                      onDecisionChange={(decision) => handleDecisionChange(endpoint.id, decision)}
                      collectionPath={collectionPath}
                      newSpec={newSpec}
                      showDecisions={true}
                      decisionLabels={{ keep: 'Keep Current', accept: 'Update' }}
                      collectionUid={collectionUid}
                    />
                  )}
                />

                <EndpointChangeSection
                  title="New in Spec"
                  type="added"
                  endpoints={specAddedEndpoints}
                  defaultExpanded={false}
                  expandableLayout
                  subtitle="New endpoints from the spec"
                  collectionUid={collectionUid}
                  sectionKey="review-added"
                  renderItem={(endpoint, idx) => (
                    <ExpandableEndpointRow
                      key={endpoint.id || idx}
                      endpoint={endpoint}
                      decision={decisions?.[endpoint.id]}
                      onDecisionChange={(decision) => handleDecisionChange(endpoint.id, decision)}
                      collectionPath={collectionPath}
                      newSpec={newSpec}
                      showDecisions={true}
                      decisionLabels={{ keep: 'Skip', accept: 'Add' }}
                      collectionUid={collectionUid}
                    />
                  )}
                />

                <EndpointChangeSection
                  title="Removed from Spec"
                  type="removed"
                  endpoints={specRemovedEndpoints}
                  defaultExpanded={false}
                  expandableLayout
                  subtitle="These endpoints are in your collection but not in the spec"
                  collectionUid={collectionUid}
                  sectionKey="review-removed"
                  renderItem={(endpoint, idx) => (
                    <ExpandableEndpointRow
                      key={endpoint.id || idx}
                      endpoint={endpoint}
                      decision={decisions?.[endpoint.id]}
                      onDecisionChange={(decision) => handleDecisionChange(endpoint.id, decision)}
                      collectionPath={collectionPath}
                      newSpec={newSpec}
                      showDecisions={true}
                      decisionLabels={{ keep: 'Keep', accept: 'Delete' }}
                      collectionUid={collectionUid}
                    />
                  )}
                />
              </div>
            )}

          </div>
        )}
      </div>

      <div className="sync-review-bottom-bar">
        <div className="bar-stats">
          {totalChanges === 0 && (
            <span className="stats-prefix">
              {specDrift?.storedSpecMissing ? 'Sync will update the spec file' : 'No endpoint changes to apply'}
            </span>
          )}
        </div>
        <div className="bar-actions">
          <Button variant="ghost" onClick={onGoBack}>Go Back</Button>
          <Button
            onClick={totalChanges === 0 ? handleConfirmApply : () => setShowConfirmation(true)}
            disabled={unresolvedConflicts > 0 || isSyncing}
            loading={isSyncing}
          >
            {buttonLabel}
            {unresolvedConflicts === 0 && <IconArrowRight size={14} style={{ marginLeft: 4 }} />}
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
        <SpecDiffModal
          specDrift={specDrift}
          onClose={() => setShowSpecDiffModal(false)}
        />
      )}
    </div>
  );
};

export default SyncReviewPage;
