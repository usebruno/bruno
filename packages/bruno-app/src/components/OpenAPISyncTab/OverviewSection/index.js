import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getTotalRequestCountInCollection } from 'utils/collections/';
import { countEndpoints } from '../utils';
import moment from 'moment';
import { IconCheck } from '@tabler/icons';
import Button from 'ui/Button';
import Help from 'components/Help';
import { useTranslation } from 'react-i18next';

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const OverviewSection = ({ collection, storedSpec, collectionDrift, specDrift, remoteDrift, onTabSelect, error, onOpenSettings }) => {
  const { t } = useTranslation();
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];

  const SUMMARY_CARDS = [
    {
      key: 'total',
      label: t('OPENAPI_SYNC.TOTAL_IN_COLLECTION'),
      color: 'blue',
      tooltip: t('OPENAPI_SYNC.TOTAL_IN_COLLECTION_TOOLTIP')
    },
    {
      key: 'inSync',
      label: t('OPENAPI_SYNC.IN_SYNC_WITH_SPEC'),
      color: 'green',
      tooltip: t('OPENAPI_SYNC.IN_SYNC_WITH_SPEC_TOOLTIP')
    },
    {
      key: 'changed',
      label: t('OPENAPI_SYNC.CHANGED_IN_COLLECTION'),
      color: 'muted',
      tooltip: t('OPENAPI_SYNC.CHANGED_IN_COLLECTION_TOOLTIP'),
      tab: 'collection-changes'
    },
    {
      key: 'pending',
      label: t('OPENAPI_SYNC.SPEC_UPDATES_PENDING'),
      color: 'amber',
      tooltip: t('OPENAPI_SYNC.SPEC_UPDATES_PENDING_TOOLTIP'),
      tab: 'spec-updates'
    }
  ];

  const reduxError = useSelector((state) => state.openapiSync?.collectionUpdates?.[collection.uid]?.error);
  const specMeta = useSelector((state) => state.openapiSync?.storedSpecMeta?.[collection.uid] || null);
  const activeError = error || reduxError;

  const version = specMeta?.version;
  const endpointCount = specMeta?.endpointCount ?? null;
  const lastSyncDate = openApiSyncConfig?.lastSyncDate;
  const groupBy = openApiSyncConfig?.groupBy || 'tags';
  const autoCheckEnabled = openApiSyncConfig?.autoCheck !== false;
  const autoCheckInterval = openApiSyncConfig?.autoCheckInterval || 5;

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
        const localModifiedIds = new Set((collectionDrift.modified || []).map((ep) => ep.id));
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
    { label: t('OPENAPI_SYNC.SPEC_VERSION'), value: version ? `v${version}` : '-' },
    { label: t('OPENAPI_SYNC.ENDPOINTS_IN_SPEC'), value: endpointCount != null ? endpointCount : '-' },
    { label: t('OPENAPI_SYNC.LAST_SYNCED_AT'), value: lastSyncDate ? moment(lastSyncDate).fromNow() : '-', tooltip: lastSyncDate ? moment(lastSyncDate).format('MMMM D, YYYY [at] h:mm A') : undefined },
    { label: t('OPENAPI_SYNC.FOLDER_GROUPING'), value: capitalize(groupBy) },
    { label: t('OPENAPI_SYNC.AUTO_CHECK_FOR_UPDATES'), value: autoCheckEnabled ? t('OPENAPI_SYNC.EVERY_MIN', { count: autoCheckInterval }) : t('OPENAPI_SYNC.DISABLED') }
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
        title: t('OPENAPI_SYNC.BANNER_FAILED_CHECK'),
        subtitle: activeError,
        buttons: ['open-settings']
      };
    }
    if (specDrift?.storedSpecMissing && !lastSyncDate) {
      return {
        variant: 'warning',
        title: t('OPENAPI_SYNC.BANNER_INITIAL_SYNC_REQUIRED'),
        subtitle: t('OPENAPI_SYNC.BANNER_INITIAL_SYNC_REQUIRED_DESC'),
        buttons: ['review']
      };
    }
    if (hasSpecUpdates && hasCollectionChanges) {
      return {
        variant: 'warning',
        title: t('OPENAPI_SYNC.BANNER_SPEC_AND_COLLECTION_CHANGES', { versionInfo }),
        subtitle: t('OPENAPI_SYNC.BANNER_SPEC_AND_COLLECTION_CHANGES_DESC'),
        buttons: ['sync', 'changes']
      };
    }
    if (hasSpecUpdates) {
      return {
        variant: 'warning',
        title: t('OPENAPI_SYNC.BANNER_SPEC_HAS_UPDATES', { versionInfo }),
        subtitle: t('OPENAPI_SYNC.BANNER_SPEC_HAS_UPDATES_DESC'),
        buttons: ['sync']
      };
    }
    if (specDrift?.storedSpecMissing && lastSyncDate) {
      return {
        variant: 'warning',
        title: t('OPENAPI_SYNC.BANNER_SPEC_NOT_FOUND'),
        subtitle: t('OPENAPI_SYNC.BANNER_SPEC_NOT_FOUND_DESC'),
        buttons: ['spec-details']
      };
    }
    if (!hasDriftData) return null;
    if (hasCollectionChanges) {
      return {
        variant: 'muted',
        title: t('OPENAPI_SYNC.BANNER_COLLECTION_HAS_CHANGES'),
        subtitle: t('OPENAPI_SYNC.BANNER_COLLECTION_HAS_CHANGES_DESC'),
        buttons: ['changes']
      };
    }
    return null;
  }, [activeError, hasDriftData, hasSpecUpdates, hasCollectionChanges, specDrift?.storedSpecMissing, specDrift?.storedVersion, specDrift?.newVersion, lastSyncDate, t]);

  return (
    <div className="overview-section">
      {bannerState && (
        <div className={`overview-status-banner ${bannerState.variant}`}>
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
                  {t('OPENAPI_SYNC.VIEW_COLLECTION_CHANGES')}
                </Button>
              )}
              {(bannerState.buttons.includes('sync') || bannerState.buttons.includes('review')) && (
                <Button size="sm" onClick={() => onTabSelect('spec-updates')}>
                  {t('OPENAPI_SYNC.REVIEW_AND_SYNC_COLLECTION')}
                </Button>
              )}
              {bannerState.buttons.includes('spec-details') && (
                <Button variant="outline" size="sm" onClick={() => onTabSelect('spec-updates')}>
                  {t('OPENAPI_SYNC.GO_TO_SPEC_UPDATES')}
                </Button>
              )}
              {bannerState.buttons.includes('open-settings') && (
                <Button variant="outline" size="sm" onClick={onOpenSettings}>
                  {t('OPENAPI_SYNC.UPDATE_CONNECTION_SETTINGS')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <h4 className="overview-section-title mt-5">{t('OPENAPI_SYNC.ENDPOINT_SUMMARY')}</h4>
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
                <span className={`summary-count ${resolvedColor}`}>{count != null ? count : '-'}</span>
                {key === 'pending' && conflictCount > 0 && (
                  <span className="conflict-annotation">({conflictCount} {conflictCount === 1 ? t('OPENAPI_SYNC.CONFLICT') : t('OPENAPI_SYNC.CONFLICTS')})</span>
                )}
              </div>
              <div className="summary-label">
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <h4 className="overview-section-title mt-7">{t('OPENAPI_SYNC.LAST_SYNCED_SPEC_DETAILS')}</h4>
      <div className="spec-details-grid">
        {details.map(({ label, value, tooltip }) => (
          <div className="spec-detail-item" key={label}>
            <div className="spec-detail-label">{label}</div>
            <div className="spec-detail-value">
              {value}
              {tooltip && (
                <Help icon="info" size={11} placement="top" width={200}>{tooltip}</Help>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OverviewSection;
