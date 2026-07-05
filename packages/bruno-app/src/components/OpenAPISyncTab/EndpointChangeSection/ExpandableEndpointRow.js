import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconChevronRight,
  IconChevronDown,
  IconCheck,
  IconX,
  IconLoader2
} from '@tabler/icons';
import { toggleRowExpanded } from 'providers/ReduxStore/slices/openapi-sync';
import MethodBadge from 'ui/MethodBadge';
import { formatIpcError } from 'utils/common/error';
import StatusBadge from 'ui/StatusBadge';
import Help from 'components/Help';
import EndpointVisualDiff from './EndpointVisualDiff';

// Expandable row - can be used with or without decision buttons
const ExpandableEndpointRow = ({ endpoint, decision, onDecisionChange, collectionPath, newSpec, showDecisions = true, decisionLabels, diffLeftLabel, diffRightLabel, swapDiffSides, collectionUid, actions, preserveValues = true }) => {
  const dispatch = useDispatch();
  const rowKey = endpoint.id || `${endpoint.method}-${endpoint.path}`;
  const isExpanded = useSelector((state) => {
    return state.openapiSync?.tabUiState?.[collectionUid]?.expandedRows?.[rowKey] || false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [diffData, setDiffData] = useState(null);
  const [error, setError] = useState(null);

  // Monotonic id so a superseded in-flight fetch (e.g. the user flips the
  // Preserve toggle mid-request) can't overwrite the latest result.
  const requestIdRef = useRef(0);

  const loadDiffData = useCallback(async () => {
    // No internal diffData guard: both callers (the expand effect and handleToggle)
    // already gate on !diffData. Guarding here would capture a stale diffData from
    // the render that recreated this callback and silently skip the toggle re-fetch.
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:get-endpoint-diff-data', {
        collectionPath,
        endpointId: endpoint.id,
        newSpec,
        preserveValues
      });

      if (requestId !== requestIdRef.current) return; // superseded by a newer fetch
      if (result.error) {
        setError(result.error);
      } else {
        setDiffData(result);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(formatIpcError(err) || 'Failed to load diff data');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [collectionPath, endpoint.id, newSpec, preserveValues]);

  // Re-fetch the preview when the preserve toggle changes — the EXPECTED column
  // depends on it. Expanded rows re-fetch in place (the old diff stays visible
  // and swaps when the new one arrives, so the row never blanks). Collapsed rows
  // just drop their cache so the next expand fetches fresh — invisible to the user.
  const didMountPreserve = useRef(false);
  useEffect(() => {
    if (!didMountPreserve.current) {
      didMountPreserve.current = true;
      return;
    }
    if (isExpanded) {
      loadDiffData(); // bumps requestId, keeps old diff until the new one lands
    } else {
      requestIdRef.current++; // invalidate any in-flight fetch
      setDiffData(null);
      setError(null);
      setIsLoading(false);
    }
    // Intentionally only re-run when the toggle flips — not on isExpanded/loadDiffData
    // changes, which the dedicated load effect + handleToggle already cover.
  }, [preserveValues]);

  // Load diff data when expanded (e.g. restored from Redux state)
  useEffect(() => {
    if (isExpanded && !diffData && !isLoading && !error) {
      loadDiffData();
    }
  }, [isExpanded, diffData, isLoading, loadDiffData, error]);

  const handleToggle = () => {
    const willExpand = !isExpanded;
    if (collectionUid) {
      dispatch(toggleRowExpanded({ collectionUid, rowKey }));
    }
    if (willExpand && !diffData && !isLoading) {
      loadDiffData();
    }
  };

  return (
    <div className={`endpoint-review-row ${showDecisions ? `decision-${decision}` : ''}`}>
      <div
        className="review-row-header"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); handleToggle();
          }
        }}
      >
        <span className="expand-toggle">
          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </span>
        <MethodBadge method={endpoint.method} />
        <span className="endpoint-path">{endpoint.path}</span>
        {endpoint.summary && <span className="endpoint-name">{endpoint.summary}</span>}
        {endpoint.name && !endpoint.summary && <span className="endpoint-name">{endpoint.name}</span>}
        {endpoint.conflict && (
          <StatusBadge
            status="danger"
            rightSection={(
              <Help icon="info" size={11} placement="top" width={250}>
                This endpoint was modified in both the spec and your collection. Choose which version to keep.
              </Help>
            )}
          >
            Conflict
          </StatusBadge>
        )}

        {actions && <div className="endpoint-actions" onClick={(e) => e.stopPropagation()}>{actions}</div>}

        {showDecisions && onDecisionChange && (
          <div className="decision-buttons" onClick={(e) => e.stopPropagation()}>
            <button
              className={`decision-btn keep ${decision === 'keep-mine' ? 'selected' : ''}`}
              onClick={() => onDecisionChange('keep-mine')}
              title="Keep your local version"
            >
              <IconX size={12} /> {decisionLabels?.keep || 'Keep Mine'}
            </button>
            <button
              className={`decision-btn accept ${decision === 'accept-incoming' ? 'selected' : ''}`}
              onClick={() => onDecisionChange('accept-incoming')}
              title="Accept the spec version"
            >
              <IconCheck size={12} /> {decisionLabels?.accept || 'Accept Spec'}
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="review-row-diff">
          {/* Spinner only on the initial load. A re-fetch (e.g. toggling Preserve)
              keeps the previous diff visible and swaps it in place, so the row
              never blanks/flickers. */}
          {isLoading && !diffData && !error && (
            <div className="diff-loading">
              <IconLoader2 size={16} className="spinning" />
              <span>Loading diff...</span>
            </div>
          )}
          {error && !diffData && (
            <div className="diff-error">
              Error: {error}
            </div>
          )}
          {diffData && !error && (
            <EndpointVisualDiff
              oldData={diffData.oldData}
              newData={diffData.newData}
              leftLabel={diffLeftLabel || 'Current (in collection)'}
              rightLabel={diffRightLabel || 'Expected (from spec)'}
              swapSides={swapDiffSides}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ExpandableEndpointRow;
