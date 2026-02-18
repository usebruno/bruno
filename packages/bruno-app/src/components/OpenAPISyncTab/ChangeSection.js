import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconChevronRight,
  IconChevronDown,
  IconCheck,
  IconX,
  IconLoader2
} from '@tabler/icons';
import { VisualDiffContent, getOpenAPIDiffSections } from 'components/Git/VisualDiffViewer';
import { toggleSectionExpanded, toggleRowExpanded } from 'providers/ReduxStore/slices/openapi-sync';
import MethodBadge from 'ui/MethodBadge';

/**
 * EndpointVisualDiff - Wrapper around VisualDiffContent for OpenAPI sync
 *
 * Props:
 * - oldData: data from collection (actual current state)
 * - newData: data from spec (expected state)
 * - leftLabel/rightLabel: custom labels for diff panes
 * - swapSides: if true, show spec on left and collection on right
 */
const EndpointVisualDiff = ({
  oldData,
  newData,
  leftLabel = 'Current (in collection)',
  rightLabel = 'Expected (from spec)',
  swapSides = false
}) => {
  const sections = useMemo(() => getOpenAPIDiffSections(), []);

  // Determine which data goes on which side based on swapSides
  const displayOldData = swapSides ? newData : oldData;
  const displayNewData = swapSides ? oldData : newData;

  return (
    <VisualDiffContent
      oldData={displayOldData}
      newData={displayNewData}
      sections={sections}
      oldLabel={leftLabel}
      newLabel={rightLabel}
      autoCollapseUnchanged={true}
    />
  );
};

// Simple endpoint item for non-review mode
const EndpointItem = ({ endpoint, type, actions }) => {
  return (
    <div className={`endpoint-item type-${type}`}>
      <div className="endpoint-row">
        <MethodBadge method={endpoint.method} />
        <span className="endpoint-path">{endpoint.path}</span>
        {endpoint.summary && <span className="endpoint-summary">{endpoint.summary}</span>}
        {endpoint.name && !endpoint.summary && <span className="endpoint-summary">{endpoint.name}</span>}
        {endpoint.deprecated && <span className="deprecated-tag">deprecated</span>}
        {actions && <div className="endpoint-actions">{actions}</div>}
      </div>
    </div>
  );
};

// Expandable row - can be used with or without decision buttons
const ExpandableEndpointRow = ({ endpoint, decision, onDecisionChange, collectionPath, newSpec, showDecisions = true, showSourceBadges = false, decisionLabels, diffLeftLabel, diffRightLabel, swapDiffSides, collectionUid, actions }) => {
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
      setError(err.message || 'Failed to load diff data');
    } finally {
      setIsLoading(false);
    }
  }, [collectionPath, endpoint.id, newSpec]);

  // Load diff data when expanded (e.g. restored from Redux state)
  useEffect(() => {
    if (isExpanded && !diffData && !isLoading) {
      loadDiffData();
    }
  }, [isExpanded, diffData, isLoading, loadDiffData]);

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
      <div className="review-row-header" onClick={handleToggle}>
        <span className="expand-toggle">
          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </span>
        <MethodBadge method={endpoint.method} />
        <span className="endpoint-path">{endpoint.path}</span>
        {endpoint.summary && <span className="endpoint-name">{endpoint.summary}</span>}
        {endpoint.name && !endpoint.summary && <span className="endpoint-name">{endpoint.name}</span>}
        {showSourceBadges && endpoint.localAction && (
          <span className={`source-tag local-${endpoint.localAction}`}>
            {endpoint.localAction === 'modified' ? 'Modified locally' : endpoint.localAction === 'deleted' ? 'Deleted locally' : `${endpoint.localAction} locally`}
          </span>
        )}
        {showSourceBadges && endpoint.specAction && (
          <span className={`source-tag spec-${endpoint.specAction}`}>
            {endpoint.specAction === 'modified' ? 'Updated in spec' : endpoint.specAction === 'removed' ? 'Removed from spec' : `${endpoint.specAction} in spec`}
          </span>
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

/**
 * ChangeSection - Reusable collapsible section for endpoint lists
 *
 * Props:
 * - title: Section title
 * - icon: Icon component to display
 * - count: Number of items
 * - type: CSS class type (modified, missing, local-only, in-sync, conflict, spec-modified, collection-drift)
 * - endpoints: Array of endpoint objects
 * - defaultExpanded: Initial expanded state
 * - actions: Optional header-level actions (buttons)
 * - renderItem: Custom render function for items (optional)
 *
 * Expandable mode props (when expandable=true):
 * - expandable: Enable expandable rows with diff view (no decision buttons)
 * - collectionPath: Path for loading diff data
 * - newSpec: Spec for diff comparison
 *
 * Review mode props (when reviewMode=true):
 * - reviewMode: Enable review UI with decision buttons and expandable diff
 * - decisions: Map of endpoint.id -> decision value
 * - onDecisionChange: Callback (endpointId, decision) => void
 * - collectionPath: Path for loading diff data
 * - newSpec: Spec for diff comparison
 */
const ChangeSection = ({
  title,
  icon: Icon,
  count,
  type,
  endpoints,
  defaultExpanded = false,
  actions,
  renderItem,
  subtitle,
  // Expandable mode props (diff view without decisions)
  expandable = false,
  // Review mode props
  reviewMode = false,
  decisions,
  onDecisionChange,
  decisionLabels,
  collectionPath,
  newSpec,
  // Diff label overrides
  diffLeftLabel,
  diffRightLabel,
  swapDiffSides,
  // Badge props
  showSourceBadges = false,
  // Per-item actions callback: (endpoint) => ReactNode
  renderItemActions,
  // Redux state props
  collectionUid,
  sectionKey
}) => {
  const dispatch = useDispatch();
  const reduxExpanded = useSelector((state) => {
    if (!collectionUid || !sectionKey) return undefined;
    return state.openapiSync?.tabUiState?.[collectionUid]?.expandedSections?.[sectionKey];
  });
  // Use Redux state if available, otherwise fall back to defaultExpanded
  const isExpanded = reduxExpanded !== undefined ? reduxExpanded : defaultExpanded;

  if (count === 0) return null;

  const renderEndpoint = (endpoint, idx) => {
    // If custom renderItem is provided, use it
    if (renderItem) {
      return renderItem(endpoint, idx);
    }

    // Review mode: use ExpandableEndpointRow with decision buttons
    if (reviewMode) {
      return (
        <ExpandableEndpointRow
          key={endpoint.id || idx}
          endpoint={endpoint}
          decision={decisions?.[endpoint.id]}
          onDecisionChange={(decision) => onDecisionChange?.(endpoint.id, decision)}
          collectionPath={collectionPath}
          newSpec={newSpec}
          showDecisions={true}
          showSourceBadges={showSourceBadges}
          decisionLabels={decisionLabels}
          diffLeftLabel={diffLeftLabel}
          diffRightLabel={diffRightLabel}
          swapDiffSides={swapDiffSides}
          collectionUid={collectionUid}
        />
      );
    }

    // Expandable mode: use ExpandableEndpointRow without decision buttons
    if (expandable) {
      return (
        <ExpandableEndpointRow
          key={endpoint.id || idx}
          endpoint={endpoint}
          collectionPath={collectionPath}
          newSpec={newSpec}
          showDecisions={false}
          showSourceBadges={showSourceBadges}
          diffLeftLabel={diffLeftLabel}
          diffRightLabel={diffRightLabel}
          swapDiffSides={swapDiffSides}
          collectionUid={collectionUid}
          actions={renderItemActions?.(endpoint)}
        />
      );
    }

    // Default: simple EndpointItem
    return (
      <EndpointItem key={endpoint.id || idx} endpoint={endpoint} type={type} />
    );
  };

  return (
    <div className={`change-section type-${type}`}>
      <div
        className="section-header"
        onClick={() => {
          if (collectionUid && sectionKey) {
            dispatch(toggleSectionExpanded({ collectionUid, sectionKey }));
          }
        }}
      >
        <IconChevronRight size={16} className={`chevron ${isExpanded ? 'expanded' : ''}`} />
        {Icon && <Icon size={16} className="section-icon" />}
        <span className={`section-title type-${type}`}>{title}</span>
        <span className="section-count">{count}</span>
        {subtitle && <span className="section-subtitle">{subtitle}</span>}
        {actions && <div className="section-actions" onClick={(e) => e.stopPropagation()}>{actions}</div>}
      </div>
      {isExpanded && (
        <div className={`section-body ${reviewMode || expandable ? 'expandable-mode' : ''}`}>
          {endpoints.map((endpoint, idx) => renderEndpoint(endpoint, idx))}
        </div>
      )}
    </div>
  );
};

export default ChangeSection;
export { EndpointItem, EndpointVisualDiff, ExpandableEndpointRow };
