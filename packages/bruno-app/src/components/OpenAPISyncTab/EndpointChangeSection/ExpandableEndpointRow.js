import React, { useCallback, useEffect, useState } from 'react';
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
const ExpandableEndpointRow = ({ endpoint, decision, onDecisionChange, collectionPath, newSpec, showDecisions = true, decisionLabels, diffLeftLabel, diffRightLabel, swapDiffSides, collectionUid, actions }) => {
  const dispatch = useDispatch();
  const rowKey = endpoint.id || `${endpoint.method}-${endpoint.path}`;
  const isExpanded = useSelector((state) => {
    return state.openapiSync?.tabUiState?.[collectionUid]?.expandedRows?.[rowKey] || false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [diffData, setDiffData] = useState(null);
  const [error, setError] = useState(null);

  const loadDiffData = useCallback(async () => {
    if (diffData) return;

    setIsLoading(true);
    setError(null);

    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:get-endpoint-diff-data', {
        collectionPath,
        endpointId: endpoint.id,
        newSpec
      });

      if (result.error) {
        setError(result.error);
      } else {
        setDiffData(result);
      }
    } catch (err) {
      setError(formatIpcError(err) || 'Failed to load diff data');
    } finally {
      setIsLoading(false);
    }
  }, [collectionPath, endpoint.id, newSpec]);

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
          {isLoading && (
            <div className="diff-loading">
              <IconLoader2 size={16} className="spinning" />
              <span>Loading diff...</span>
            </div>
          )}
          {error && (
            <div className="diff-error">
              Error: {error}
            </div>
          )}
          {diffData && !isLoading && !error && (
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
