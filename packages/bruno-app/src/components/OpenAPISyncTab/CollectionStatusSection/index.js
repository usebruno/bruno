import { useMemo } from 'react';
import {
  IconCheck,
  IconPlus,
  IconTrash,
  IconArrowBackUp,
  IconExternalLink,
  IconAlertTriangle,
  IconInfoCircle,
  IconLoader2
} from '@tabler/icons';
import moment from 'moment';
import Button from 'ui/Button';
import StatusBadge from 'ui/StatusBadge';
import Modal from 'components/Modal';
import EndpointChangeSection from '../EndpointChangeSection';
import ExpandableEndpointRow from '../EndpointChangeSection/ExpandableEndpointRow';
import useEndpointActions from '../hooks/useEndpointActions';
import { useTranslation } from 'react-i18next';

const CollectionStatusSection = ({
  collection,
  collectionDrift,
  reloadDrift,
  specDrift,
  storedSpec,
  lastSyncDate,
  onOpenEndpoint,
  isLoading,
  onTabSelect
}) => {
  const { t } = useTranslation();
  const {
    pendingAction, setPendingAction,
    confirmPendingAction,
    handleResetEndpoint,
    handleResetAllModified,
    handleDeleteEndpoint,
    handleDeleteAllLocalOnly,
    handleRevertAllChanges,
    handleAddMissingEndpoint,
    handleAddAllMissing
  } = useEndpointActions(collection, collectionDrift, reloadDrift, t);

  const spec = storedSpec || specDrift?.newSpec;
  const hasStoredSpec = collectionDrift && !collectionDrift.noStoredSpec;
  const hasDrift = hasStoredSpec && (collectionDrift.modified?.length > 0
    || collectionDrift.missing?.length > 0
    || collectionDrift.localOnly?.length > 0);

  const renderDriftRow = (endpoint, idx, actions) => (
    <ExpandableEndpointRow
      key={endpoint.id}
      endpoint={endpoint}
      collectionPath={collection.pathname}
      newSpec={spec}
      showDecisions={false}
      diffLeftLabel={t('OPENAPI_SYNC.LAST_SYNCED_SPEC')}
      diffRightLabel={t('OPENAPI_SYNC.CURRENT_IN_COLLECTION')}
      swapDiffSides
      collectionUid={collection.uid}
      actions={actions}
    />
  );

  const modifiedCount = collectionDrift?.modified?.length || 0;
  const missingCount = collectionDrift?.missing?.length || 0;
  const localOnlyCount = collectionDrift?.localOnly?.length || 0;
  const version = specDrift?.storedVersion || storedSpec?.info?.version;

  const bannerState = useMemo(() => {
    if (hasDrift) {
      return {
        variant: 'muted',
        message: t('OPENAPI_SYNC.COLLECTION_HAS_CHANGES_SINCE_LAST_SYNC'),
        badges: { modifiedCount, missingCount, localOnlyCount },
        actions: ['revert-all']
      };
    }
    return null;
  }, [hasDrift, modifiedCount, missingCount, localOnlyCount, version, lastSyncDate, t]);

  return (
    <div className="collection-status-section">
      {bannerState && (
        <div className={`spec-update-banner ${bannerState.variant}`}>
          <div className="banner-left">
            {bannerState.variant === 'success'
              ? <IconCheck size={16} className="status-check-icon" />
              : <div className={`status-dot ${bannerState.variant}`} />}
            <span className="banner-title">
              {bannerState.message}
            </span>
            {bannerState.badges && (
              <span className="banner-details">
                {bannerState.badges.modifiedCount > 0 && <StatusBadge status="warning" radius="full">{bannerState.badges.modifiedCount} {t('OPENAPI_SYNC.MODIFIED')}</StatusBadge>}
                {bannerState.badges.missingCount > 0 && <StatusBadge status="danger" radius="full">{bannerState.badges.missingCount} {t('OPENAPI_SYNC.DELETED')}</StatusBadge>}
                {bannerState.badges.localOnlyCount > 0 && <StatusBadge status="muted" radius="full">{bannerState.badges.localOnlyCount} {t('OPENAPI_SYNC.ADDED')}</StatusBadge>}
              </span>
            )}
          </div>
          {bannerState.actions.includes('revert-all') && (
            <div className="banner-actions">
              <Button size="sm" variant="ghost" color="danger" onClick={handleRevertAllChanges}>
                {t('OPENAPI_SYNC.REVERT_ALL_TO_SPEC')}
              </Button>
            </div>
          )}
        </div>
      )}

      {hasDrift && (
        <div className="sync-info-notice mt-4">
          <IconInfoCircle size={14} className="sync-info-icon" />
          <span><span className="whats-updated-title">{t('OPENAPI_SYNC.WHATS_TRACKED_TITLE')}</span> {t('OPENAPI_SYNC.WHATS_TRACKED_DESC')}</span>
        </div>
      )}

      {hasDrift ? (
        <div className="mt-5">
          {/* Modified in Collection */}
          <EndpointChangeSection
            title={t('OPENAPI_SYNC.MODIFIED_IN_COLLECTION')}
            type="modified"
            endpoints={collectionDrift.modified || []}
            expandableLayout
            collectionUid={collection.uid}
            sectionKey="drift-modified"
            renderItem={(endpoint, idx) =>
              renderDriftRow(endpoint, idx, (
                <>
                  <Button size="xs" variant="ghost" onClick={() => onOpenEndpoint(endpoint.id)} title={t('OPENAPI_SYNC.OPEN_IN_TAB')} icon={<IconExternalLink size={14} />}>
                    {t('OPENAPI_SYNC.OPEN')}
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => handleResetEndpoint(endpoint)} title={t('OPENAPI_SYNC.RESET_TO_SPEC')} icon={<IconArrowBackUp size={14} />}>
                    {t('OPENAPI_SYNC.RESET')}
                  </Button>
                </>
              ))}
            actions={(
              <Button
                size="xs"
                variant="outline"
                onClick={handleResetAllModified}
                title={t('OPENAPI_SYNC.RESET_ALL_MODIFIED_DESC')}
                icon={<IconArrowBackUp size={14} />}
              >
                {t('OPENAPI_SYNC.RESET_ALL')}
              </Button>
            )}
          />

          {/* Deleted from Collection */}
          <EndpointChangeSection
            title={t('OPENAPI_SYNC.DELETED_FROM_COLLECTION')}
            type="missing"
            endpoints={collectionDrift.missing || []}
            expandableLayout
            collectionUid={collection.uid}
            sectionKey="drift-missing"
            renderItem={(endpoint, idx) =>
              renderDriftRow(endpoint, idx, (
                <Button size="xs" variant="ghost" onClick={() => handleAddMissingEndpoint(endpoint)} title={t('OPENAPI_SYNC.RESTORE_TO_COLLECTION')} icon={<IconPlus size={14} />}>
                  {t('OPENAPI_SYNC.RESTORE')}
                </Button>
              ))}
            actions={(
              <Button
                size="xs"
                variant="outline"
                onClick={handleAddAllMissing}
                title={t('OPENAPI_SYNC.RESTORE_ALL_DELETED_DESC')}
                icon={<IconPlus size={14} />}
              >
                {t('OPENAPI_SYNC.RESTORE_ALL')}
              </Button>
            )}
          />

          {/* Added to Collection */}
          <EndpointChangeSection
            title={t('OPENAPI_SYNC.ADDED_TO_COLLECTION')}
            type="local-only"
            endpoints={collectionDrift.localOnly || []}
            expandableLayout
            collectionUid={collection.uid}
            sectionKey="drift-local-only"
            renderItem={(endpoint, idx) =>
              renderDriftRow(endpoint, idx, (
                <>
                  <Button size="xs" variant="ghost" onClick={() => onOpenEndpoint(endpoint.id)} title={t('OPENAPI_SYNC.OPEN_IN_TAB')} icon={<IconExternalLink size={14} />}>
                    {t('OPENAPI_SYNC.OPEN')}
                  </Button>
                  <Button size="xs" variant="ghost" color="danger" onClick={() => handleDeleteEndpoint(endpoint)} title={t('OPENAPI_SYNC.DELETE_ENDPOINT')} icon={<IconTrash size={14} />}>
                    {t('OPENAPI_SYNC.DELETE')}
                  </Button>
                </>
              ))}
            actions={(
              <Button
                size="xs"
                variant="outline"
                color="danger"
                onClick={handleDeleteAllLocalOnly}
                title={t('OPENAPI_SYNC.DELETE_ALL_LOCAL_DESC')}
                icon={<IconTrash size={14} />}
              >
                {t('OPENAPI_SYNC.DELETE_ALL')}
              </Button>
            )}
          />
        </div>
      ) : isLoading ? (
        <div className="sync-review-empty-state mt-5">
          <IconLoader2 size={40} className="empty-state-icon animate-spin" />
          <h4>{t('OPENAPI_SYNC.CHECKING_FOR_UPDATES')}</h4>
          <p>{t('OPENAPI_SYNC.COMPARING_COLLECTION_WITH_SPEC')}</p>
        </div>
      ) : !hasStoredSpec ? (
        <div className="sync-review-empty-state mt-5">
          <IconAlertTriangle size={40} className="empty-state-icon" />
          <h4>{lastSyncDate ? t('OPENAPI_SYNC.CANNOT_TRACK_CHANGES') : t('OPENAPI_SYNC.WAITING_FOR_INITIAL_SYNC')}</h4>
          <p>{lastSyncDate
            ? t('OPENAPI_SYNC.CANNOT_TRACK_CHANGES_DESC')
            : t('OPENAPI_SYNC.WAITING_FOR_INITIAL_SYNC_DESC')}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => onTabSelect('spec-updates')}>{t('OPENAPI_SYNC.GO_TO_SPEC_UPDATES')}</Button>
        </div>
      ) : (
        <div className="sync-review-empty-state mt-5">
          <IconCheck size={40} className="empty-state-icon" />
          <h4>{t('OPENAPI_SYNC.NO_CHANGES_IN_COLLECTION')}</h4>
          <p>{t('OPENAPI_SYNC.NO_CHANGES_IN_COLLECTION_DESC')}</p>
        </div>
      )}
      {/* Action confirmation modal */}
      {pendingAction && (
        <Modal size="sm" title={pendingAction.title} hideFooter={true} handleCancel={() => setPendingAction(null)}>
          <div className="action-confirm-modal">
            <p className="confirm-message">{pendingAction.message}</p>
            <div className="confirm-actions">
              <Button variant="ghost" onClick={() => setPendingAction(null)}>
                {t('COMMON.CANCEL')}
              </Button>
              <Button
                color={pendingAction.type.includes('delete') ? 'danger' : 'primary'}
                onClick={confirmPendingAction}
              >
                {t('COMMON.CONFIRM')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CollectionStatusSection;
