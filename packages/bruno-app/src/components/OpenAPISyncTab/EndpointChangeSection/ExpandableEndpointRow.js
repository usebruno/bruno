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
import { useTranslation } from 'react-i18next';

// Expandable row - can be used with or without decision buttons
const ExpandableEndpointRow = ({ endpoint, decision, onDecisionChange, collectionPath, newSpec, showDecisions = true, decisionLabels, diffLeftLabel, diffRightLabel, swapDiffSides, collectionUid, actions }) => {
  const { t } = useTranslation();
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
      setError(formatIpcError(err) || t('OPENAPI_SYNC.FAILED_LOAD_DIFF'));
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
                {t('OPENAPI_SYNC.CONFLICT_HELP')}
              </Help>
            )}
          >
            {t('OPENAPI_SYNC.CONFLICT')}
          </StatusBadge>
        )}

        {actions && <div className="endpoint-actions" onClick={(e) => e.stopPropagation()}>{actions}</div>}

        {showDecisions && onDecisionChange && (
          <div className="decision-buttons" onClick={(e) => e.stopPropagation()}>
            <button
              className={`decision-btn keep ${decision === 'keep-mine' ? 'selected' : ''}`}
              onClick={() => onDecisionChange('keep-mine')}
              title={t('OPENAPI_SYNC.KEEP_LOCAL_VERSION')}
            >
              <IconX size={12} /> {decisionLabels?.keep || t('OPENAPI_SYNC.KEEP_MINE')}
            </button>
            <button
              className={`decision-btn accept ${decision === 'accept-incoming' ? 'selected' : ''}`}
              onClick={() => onDecisionChange('accept-incoming')}
              title={t('OPENAPI_SYNC.ACCEPT_SPEC_VERSION')}
            >
              <IconCheck size={12} /> {decisionLabels?.accept || t('OPENAPI_SYNC.ACCEPT_SPEC')}
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="review-row-diff">
          {isLoading && (
            <div className="diff-loading">
              <IconLoader2 size={16} className="spinning" />
              <span>{t('OPENAPI_SYNC.LOADING_DIFF')}</span>
            </div>
          )}
          {error && (
            <div className="diff-error">
              {t('OPENAPI_SYNC.ERROR_COLON')} {error}
            </div>
          )}
          {diffData && !isLoading && !error && (
            <EndpointVisualDiff
              oldData={diffData.oldData}
              newData={diffData.newData}
              leftLabel={diffLeftLabel || t('OPENAPI_SYNC.CURRENT_IN_COLLECTION')}
              rightLabel={diffRightLabel || t('OPENAPI_SYNC.EXPECTED_FROM_SPEC')}
              swapSides={swapDiffSides}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ExpandableEndpointRow;
