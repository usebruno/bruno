import {
  IconRefresh,
  IconX,
  IconCheck
} from '@tabler/icons';
import Button from 'ui/Button';

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getSpecStatusState = ({
  isLoading, error, diffResult, openApiSyncConfig, hasLocalDrift, storedSpec, specAdded, specModified, specRemoved, lastCheckedAt
}) => {
  const hasUpdates = diffResult?.hasRemoteChanges;
  const hasError = error || diffResult?.isValid === false;
  const errorMessage = error || diffResult?.error || 'Invalid OpenAPI specification';
  const lastSyncedAt = openApiSyncConfig?.lastSyncDate;
  const storedVersion = storedSpec?.info?.version || diffResult?.storedVersion;
  const newVersion = diffResult?.newVersion;

  // 1. Loading
  if (isLoading) {
    return { variant: 'muted', dotVariant: 'muted', title: 'Checking for updates...', hasButtons: false };
  }

  // 2. Error
  if (hasError) {
    return { variant: 'danger', dotVariant: 'danger', title: errorMessage, hasButtons: 'error' };
  }

  // 3. No diffResult yet, never synced — hide section
  if (!diffResult && !lastSyncedAt) {
    return null;
  }

  // 4. No diffResult yet, but previously synced — show cached up-to-date
  if (!diffResult && lastSyncedAt) {
    return {
      variant: 'success', dotVariant: 'success', title: 'Spec is ',
      titleBold: 'up to date',
      versionText: storedVersion,
      checkedText: formatRelativeTime(lastCheckedAt || lastSyncedAt),
      hasButtons: 'check-only'
    };
  }

  // 5. First-time setup — stored spec missing, never synced
  if (diffResult.storedSpecMissing && !lastSyncedAt) {
    return { variant: 'info', dotVariant: 'info', title: 'Review required — your collection differs from the spec', hasButtons: 'setup' };
  }

  // 6. Stored spec missing + remote has updates
  if (diffResult.storedSpecMissing && hasUpdates) {
    return { variant: 'warning', dotVariant: 'warning', title: 'Local spec file not found — sync to restore', hasButtons: 'remote' };
  }

  // 7. Stored spec missing + no updates
  if (diffResult.storedSpecMissing && !hasUpdates) {
    return { variant: 'warning', dotVariant: 'warning', title: 'Local spec file not found — collection matches remote', hasButtons: 'spec-only', specOnlyLabel: 'Restore Spec File' };
  }

  // 8. Spec updated but collection already in sync
  if (diffResult.hasRemoteChanges && !hasUpdates) {
    return { variant: 'info', dotVariant: 'info', title: 'Spec updated — collection already in sync', hasButtons: 'spec-only' };
  }

  // 9. Updates + local drift
  if (hasUpdates && hasLocalDrift) {
    const versionInfo = diffResult.storedVersion && newVersion && diffResult.storedVersion !== newVersion
      ? ` (v${diffResult.storedVersion} → v${newVersion})`
      : '';
    return {
      variant: 'warning', dotVariant: 'warning',
      title: `OpenAPI spec has been updated${versionInfo}`,
      hasButtons: 'remote-drift',
      showDetailTags: true, specAdded, specModified, specRemoved
    };
  }

  // 10. Updates, no local drift
  if (hasUpdates) {
    const versionInfo = diffResult.storedVersion && newVersion && diffResult.storedVersion !== newVersion
      ? ` (v${diffResult.storedVersion} → v${newVersion})`
      : '';
    return {
      variant: 'warning', dotVariant: 'warning',
      title: `OpenAPI spec has been updated${versionInfo}`,
      hasButtons: 'remote',
      showDetailTags: true, specAdded, specModified, specRemoved
    };
  }

  // 11. Fallthrough — up to date (check just completed)
  return {
    variant: 'success', dotVariant: 'success', title: 'Spec is ',
    titleBold: 'up to date',
    versionText: newVersion || storedVersion,
    checkedText: formatRelativeTime(lastCheckedAt) || 'just now',
    hasButtons: 'check-only'
  };
};

const SpecStatusSection = ({
  diffResult, storedSpec, openApiSyncConfig, lastCheckedAt, error, isLoading,
  hasLocalDrift, specAdded, specModified, specRemoved, sourceUrl,
  onCheck, onDismissError,
  onPreviewAndSync, onSyncNow, onReviewAndSync
}) => {
  const bannerState = getSpecStatusState({
    isLoading, error, diffResult, openApiSyncConfig, hasLocalDrift,
    storedSpec, specAdded, specModified, specRemoved, lastCheckedAt
  });

  if (!bannerState) return null;

  const canCheck = !!sourceUrl?.trim();

  return (
    <div className="spec-status-section">
      <div className="sync-summary-title-row">
        <div>
          <div className="sync-summary-title">Spec Status</div>
          <div className="sync-summary-subtitle">Checks if the spec has changed at the source URL</div>
        </div>
      </div>

      <div className={`spec-update-banner ${bannerState.variant}`}>
        <div className="banner-left">
          {bannerState.variant === 'success'
            ? <IconCheck size={16} className="status-check-icon" />
            : <div className={`status-dot ${bannerState.dotVariant}`} />}
          <span className="banner-title">
            {bannerState.title}
            {bannerState.titleBold && <strong>{bannerState.titleBold}</strong>}
            {bannerState.versionText && (
              <> &middot; <code className="version-code">v{bannerState.versionText}</code></>
            )}
            {bannerState.checkedText && (
              <span className="checked-text"> &middot; Checked {bannerState.checkedText}</span>
            )}
          </span>
          {bannerState.showDetailTags && (bannerState.specAdded > 0 || bannerState.specModified > 0 || bannerState.specRemoved > 0) && (
            <span className="banner-details">
              {[
                bannerState.specAdded > 0 && <span key="added" className="detail-tag added">{bannerState.specAdded} {bannerState.specAdded > 1 ? 'endpoints' : 'endpoint'} added</span>,
                bannerState.specModified > 0 && <span key="modified" className="detail-tag modified">{bannerState.specModified} {bannerState.specModified > 1 ? 'endpoints' : 'endpoint'} updated</span>,
                bannerState.specRemoved > 0 && <span key="removed" className="detail-tag removed">{bannerState.specRemoved} {bannerState.specRemoved > 1 ? 'endpoints' : 'endpoint'} removed</span>
              ].filter(Boolean)}
            </span>
          )}
        </div>
        <div className="banner-actions">
          {bannerState.hasButtons && bannerState.hasButtons !== false && (
            <Button
              color="secondary"
              size="sm"
              onClick={onCheck}
              disabled={!canCheck}
              loading={isLoading}
              icon={<IconRefresh size={14} />}
            >
              Check for updates
            </Button>
          )}
          {/* {bannerState.hasButtons === 'error' && onDismissError && (
            <button className="banner-close-btn" onClick={onDismissError} title="Dismiss" type="button">
              <IconX size={14} />
            </button>
          )} */}
          {bannerState.hasButtons === 'remote-drift' && (
            <Button size="sm" onClick={onReviewAndSync}>Review and Sync Collection</Button>
          )}
          {bannerState.hasButtons === 'setup' && (
            <Button size="sm" onClick={onPreviewAndSync}>Review Changes and Sync Collection</Button>
          )}
          {bannerState.hasButtons === 'remote' && (
            <Button size="sm" onClick={onPreviewAndSync}>Review and Sync Collection</Button>
          )}
          {bannerState.hasButtons === 'spec-only' && (
            <Button size="sm" onClick={() => onSyncNow?.()}>{bannerState.specOnlyLabel || 'Update Spec File'}</Button>
          )}

        </div>
      </div>
    </div>
  );
};

export default SpecStatusSection;
