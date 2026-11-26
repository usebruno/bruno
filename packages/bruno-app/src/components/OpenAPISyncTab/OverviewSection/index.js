import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AUTH_PLACEMENTS, DEFAULT_AUTH_PLACEMENT, DEFAULT_REQUEST_NAME_SOURCE, REQUEST_NAME_SOURCES } from '@usebruno/common';
import { getTotalRequestCountInCollection } from 'utils/collections/';
import { countEndpoints } from '../utils';
import moment from 'moment';
import { IconCheck } from '@tabler/icons';
import Button from 'ui/Button';
import StatusBadge from 'ui/StatusBadge';
import Help from 'components/Help';
import { requestNameSourceLabels } from 'components/Sidebar/ImportSettings/RequestNameSourceOption';

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const authPlacementInfo = {
  collection: 'Authentication is set at the collection level and inherited by each request.',
  request: 'Authentication is set separately on each request.'
};

const SUMMARY_CARDS = [
  {
    key: 'total',
    label: 'Total in Collection',
    color: 'blue',
    tooltip: 'Total endpoints in your collection'
  },
  {
    key: 'inSync',
    label: 'In Sync with Spec',
    color: 'green',
    tooltip: 'Endpoints that currently match the latest spec from the source'
  },
  {
    key: 'changed',
    label: 'Changed in Collection',
    color: 'muted',
    tooltip: 'Endpoints modified, deleted, or added locally since last sync',
    tab: 'collection-changes'
  },
  {
    key: 'pending',
    label: 'Spec Updates Pending',
    color: 'amber',
    tooltip: 'Spec changes available to sync to your collection',
    tab: 'spec-updates'
  }
];

const OverviewSection = ({ collection, storedSpec, collectionDrift, specDrift, remoteDrift, onTabSelect, error, onOpenSettings }) => {
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];

  const reduxError = useSelector((state) => state.openapiSync?.collectionUpdates?.[collection.uid]?.error);
  const specMeta = useSelector((state) => state.openapiSync?.storedSpecMeta?.[collection.uid] || null);
  const activeError = error || reduxError;

  const version = specMeta?.version;
  const endpointCount = specMeta?.endpointCount ?? null;
  const lastSyncDate = openApiSyncConfig?.lastSyncDate;
  const groupBy = openApiSyncConfig?.groupBy || 'tags';
  const autoCheckEnabled = openApiSyncConfig?.autoCheck !== false;
  const autoCheckInterval = openApiSyncConfig?.autoCheckInterval || 5;
  const requestNameSource = REQUEST_NAME_SOURCES.includes(openApiSyncConfig?.requestNameSource)
    ? openApiSyncConfig.requestNameSource
    : DEFAULT_REQUEST_NAME_SOURCE;
  const authPlacement = AUTH_PLACEMENTS.includes(openApiSyncConfig?.authPlacement)
    ? openApiSyncConfig.authPlacement
    : DEFAULT_AUTH_PLACEMENT;

  // Endpoint Summary counts
  // Total: from collection items in Redux; In Sync: from remote spec comparison
  // Changed/Conflicts: compare against stored spec in AppData (0 on initial sync)
  const hasDriftData = collectionDrift && !collectionDrift.noStoredSpec;

  const totalInCollection = getTotalRequestCountInCollection(collection);

  const inSyncCount = remoteDrift
    ? (remoteDrift.inSync?.length || 0)
    : null;

  const changedInCollection = hasDriftData
    ? (collectionDrift.modified?.length || 0) + (collectionDrift.missing?.length || 0) + (collectionDrift.localOnly?.length || 0)
    : 0;

  const specUpdatesPending = hasDriftData
    ? (specDrift?.added?.length || 0) + (specDrift?.modified?.length || 0) + (specDrift?.removed?.length || 0)
    : (remoteDrift?.modified?.length || 0) + (remoteDrift?.missing?.length || 0);

  // Conflict count: endpoints modified in both spec and collection
  const conflictCount = hasDriftData && specDrift?.modified
    ? (() => {
        const localModifiedIds = new Set((collectionDrift.edited || []).map((ep) => ep.id));
        return specDrift.modified.filter((ep) => localModifiedIds.has(ep.id)).length;
      })()
    : 0;

  const summaryValues = {
    total: totalInCollection,
    inSync: inSyncCount,
    changed: changedInCollection,
    pending: activeError ? null : specDrift ? specUpdatesPending : null
  };

  const details = [
    { label: 'Spec Version', value: version ? `v${version}` : '–' },
    { label: 'Endpoints in Spec', value: endpointCount != null ? endpointCount : '–' },
    {
      label: 'Last Synced At',
      value: lastSyncDate ? moment(lastSyncDate).fromNow() : '–',
      tooltip: lastSyncDate ? moment(lastSyncDate).format('MMMM D, YYYY [at] h:mm A') : undefined,
      headerExtra: (
        <StatusBadge
          radius="full"
          rightSection={(
            <Help icon="info" size={11} placement="left" width={220} dataTestId="openapi-sync-auto-check-help">
              {autoCheckEnabled
                ? `Bruno checks the spec for changes every ${autoCheckInterval} minutes. You can change this in Edit connection settings.`
                : 'Bruno does not check the spec for changes on its own. Use Check for updates, or turn it on in Edit connection settings.'}
            </Help>
          )}
        >
          {autoCheckEnabled ? `Auto-check every ${autoCheckInterval} min` : 'Auto-check off'}
        </StatusBadge>
      )
    },
    { label: 'Folder Grouping', value: capitalize(groupBy) },
    {
      label: 'Request Naming',
      labelTooltip: 'Requests are named using the field you pick. If a request doesn\'t have it, Bruno tries the next one in this order: Summary → Operation ID → Description → URL path.',
      value: requestNameSourceLabels[requestNameSource]
    },
    {
      label: 'Auth Placement',
      value: capitalize(authPlacement),
      tooltip: authPlacementInfo[authPlacement]
    }
  ];

  const hasCollectionChanges = changedInCollection > 0;
  const hasSpecUpdates = specUpdatesPending > 0;

  const bannerState = useMemo(() => {
    const versionInfo = (specDrift?.storedVersion && specDrift?.newVersion && specDrift.storedVersion !== specDrift.newVersion)
      ? ` (v${specDrift.storedVersion} → v${specDrift.newVersion})`
      : '';

    if (activeError) {
      return {
        variant: 'danger',
        title: 'Failed to check for spec updates',
        subtitle: activeError,
        buttons: ['open-settings']
      };
    }
    if (specDrift?.storedSpecMissing && !lastSyncDate) {
      return {
        variant: 'warning',
        title: 'Initial sync required — your collection differs from the spec',
        subtitle: 'Review the changes and sync to bring your collection up to date.',
        buttons: ['review']
      };
    }
    if (hasSpecUpdates && hasCollectionChanges) {
      return {
        variant: 'warning',
        title: `OpenAPI spec has new updates${versionInfo} and the collection has changes`,
        subtitle: 'New or changed requests are available. Some collection changes may be overwritten.',
        buttons: ['sync', 'changes']
      };
    }
    if (hasSpecUpdates) {
      return {
        variant: 'warning',
        title: `OpenAPI spec has new updates${versionInfo}`,
        subtitle: 'New or changed requests are available.',
        buttons: ['sync']
      };
    }
    if (specDrift?.storedSpecMissing && lastSyncDate) {
      return {
        variant: 'warning',
        title: 'Last synced spec not found',
        subtitle: 'The last synced spec is missing in the storage. Restore the latest spec from the source to track collection changes.',
        buttons: ['spec-details']
      };
    }
    if (!hasDriftData) return null;
    if (hasCollectionChanges) {
      return {
        variant: 'muted',
        title: 'Collection has changes not in the spec',
        subtitle: 'Some requests have been modified or removed and no longer match the spec.',
        buttons: ['changes']
      };
    }
    return null;
  }, [activeError, hasDriftData, hasSpecUpdates, hasCollectionChanges, specDrift?.storedSpecMissing, specDrift?.storedVersion, specDrift?.newVersion, lastSyncDate]);

  return (
    <div className="overview-section">
      {bannerState && (
        <div className={`overview-status-banner ${bannerState.variant}`} data-testid="openapi-sync-overview-banner">
          <div className="banner-text">
            <div className="banner-title-row">
              {bannerState.variant === 'success'
                ? <IconCheck size={16} className="status-check-icon" />
                : <div className={`status-dot ${bannerState.variant}`} />}
              <span className="banner-title">{bannerState.title}</span>
            </div>
            {bannerState.subtitle && (
              <p className="banner-subtitle">{bannerState.subtitle}</p>
            )}
          </div>
          {bannerState.buttons.length > 0 && (
            <div className="banner-button-row">
              {bannerState.buttons.includes('changes') && (
                <Button
                  size="sm"
                  variant={bannerState.buttons.includes('sync') ? 'outline' : 'filled'}
                  color={bannerState.buttons.includes('sync') ? 'secondary' : 'primary'}
                  onClick={() => onTabSelect('collection-changes')}
                >
                  View Collection Changes
                </Button>
              )}
              {(bannerState.buttons.includes('sync') || bannerState.buttons.includes('review')) && (
                <Button size="sm" onClick={() => onTabSelect('spec-updates')}>
                  Review and Sync Collection
                </Button>
              )}
              {bannerState.buttons.includes('spec-details') && (
                <Button variant="outline" size="sm" onClick={() => onTabSelect('spec-updates')}>
                  Go to Spec Updates
                </Button>
              )}
              {bannerState.buttons.includes('open-settings') && (
                <Button variant="outline" size="sm" onClick={onOpenSettings}>
                  Update connection settings
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <h4 className="overview-section-title mt-5">Endpoint Summary</h4>
      <div className="sync-summary-cards">
        {SUMMARY_CARDS.map(({ key, label, tooltip, tab, color }) => {
          const count = summaryValues[key];
          const resolvedColor = count > 0 ? color : 'muted';
          const isClickable = tab && count > 0;
          return (
            <div
              className={`summary-card${isClickable ? ' clickable' : ''}`}
              key={key}
              onClick={isClickable ? () => onTabSelect(tab) : undefined}
            >
              <span className="card-info-icon">
                <Help icon="info" size={12} placement="top" width={220}>{tooltip}</Help>
              </span>
              <div className="summary-count-row">
                <span className={`summary-count ${resolvedColor}`}>{count != null ? count : '–'}</span>
                {key === 'pending' && conflictCount > 0 && (
                  <span className="conflict-annotation">({conflictCount} {conflictCount === 1 ? 'conflict' : 'conflicts'})</span>
                )}
              </div>
              <div className="summary-label">
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <h4 className="overview-section-title mt-7">Last Synced Spec Details</h4>
      <div className="spec-details-grid">
        {details.map(({ label, labelTooltip, headerExtra, value, tooltip }) => {
          const detailTestId = `openapi-sync-detail-${label.toLowerCase().replaceAll(' ', '-')}`;
          return (
            <div className="spec-detail-item" key={label}>
              <div className="spec-detail-header">
                <div className="spec-detail-label">
                  {label}
                  {labelTooltip && (
                    <Help icon="info" size={11} placement="top" width={220} dataTestId={`${detailTestId}-label-help`}>{labelTooltip}</Help>
                  )}
                </div>
                {headerExtra}
              </div>
              <div className="spec-detail-value" data-testid={detailTestId}>
                {value}
                {tooltip && (
                  <Help icon="info" size={11} placement="top" width={200} dataTestId={`${detailTestId}-help`}>{tooltip}</Help>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OverviewSection;
