import {
  IconCopy,
  IconDotsVertical,
  IconUnlink,
  IconExternalLink,
  IconFolder,
  IconRefresh
} from '@tabler/icons';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import ActionIcon from 'ui/ActionIcon/index';
import MenuDropdown from 'ui/MenuDropdown';

const SpecInfoCard = ({
  collection, spec, sourceUrl, onCheck, isChecking, canCheck, groupBy, diffResult, remoteDrift, onShowDiff, onDisconnect, error,
  // Sync status footer props
  hasLocalDrift,
  onPreviewAndSync,
  onSyncNow,
  onReviewAndSync,
  onDiscardAndSync,
  onViewLocalChanges,
  onResetAllModified
}) => {
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.sync;
  const specFilename = openApiSyncConfig?.specFilename || 'openapi.json';
  const specPath = `${collection.pathname}/resources/specs/${specFilename}`;

  const title = spec?.info?.title || 'Unknown API';
  const version = spec?.info?.version || '-';

  const hasUpdates = diffResult?.hasRemoteChanges;
  const hasError = error || diffResult?.isValid === false;
  const errorMessage = error || diffResult?.error || 'Invalid OpenAPI specification';
  const lastSyncedAt = openApiSyncConfig?.lastSyncDate;

  const getFooterState = () => {
    if (hasError) {
      return { variant: 'danger', dot: 'danger', title: errorMessage, subtitle: 'Check your spec URL or file and try again.', hasLink: false, hasButtons: false };
    }
    if (!diffResult) {
      return { variant: 'muted', dot: 'muted', title: 'Checking for updates...', subtitle: null, hasLink: false, hasButtons: false };
    }
    if (diffResult.storedSpecMissing && !lastSyncedAt) {
      return { variant: 'info', dot: 'info', title: 'Review required — your collection differs from the spec', subtitle: 'Review the changes and sync collection to complete the initial OpenAPI Sync setup.', hasLink: true, hasButtons: 'setup' };
    }
    if (diffResult.storedSpecMissing && hasUpdates) {
      return { variant: 'warning', dot: 'warning', title: 'Local spec file not found — sync to restore', subtitle: 'The stored spec file is missing. Syncing will download the remote spec and restore the local baseline.', hasLink: true, hasButtons: 'remote' };
    }
    if (diffResult.storedSpecMissing && !hasUpdates) {
      return { variant: 'warning', dot: 'warning', title: 'Local spec file not found — collection matches remote', subtitle: 'All endpoints match the remote spec. Sync to restore the local spec file.', hasLink: true, hasButtons: 'spec-only', specOnlyLabel: 'Restore Spec File' };
    }
    if (diffResult.hasRemoteChanges && !hasUpdates) {
      return { variant: 'info', dot: 'info', title: 'Spec updated — collection already in sync', subtitle: 'The remote spec has changed but your collection already matches. Sync to update the local spec file.', hasLink: true, hasButtons: 'spec-only' };
    }
    if (hasUpdates && hasLocalDrift) {
      return { variant: 'warning', dot: 'warning', title: 'Updates available — local changes may be affected', subtitle: 'Remote spec has updates ready to sync. Some endpoints have been modified locally and will be overwritten unless reviewed.', hasLink: true, hasButtons: 'remote-drift' };
    }
    if (hasUpdates) {
      return { variant: 'info', dot: 'info', title: 'Updates available from remote spec', subtitle: 'New or updated endpoints are ready to sync.', hasLink: true, hasButtons: 'remote' };
    }
    if (hasLocalDrift) {
      return { variant: 'warning', dot: 'warning', title: 'Collection has changes that are not present in the spec', subtitle: 'Some endpoints have been modified locally and no longer match the spec.', hasLink: false, hasButtons: 'drift' };
    }
    return { variant: 'success', dot: 'success', title: 'Collection is in sync', subtitle: 'All endpoints match the remote spec.', hasLink: false, hasButtons: false };
  };

  const footerState = getFooterState();

  const copyPath = () => {
    navigator.clipboard.writeText(specPath);
    toast.success('Path copied to clipboard');
  };

  const copyUrl = () => {
    if (!sourceUrl) return;
    navigator.clipboard.writeText(sourceUrl);
    toast.success('URL copied to clipboard');
  };

  const openRemoteUrl = () => {
    if (!sourceUrl) return;
    window?.ipcRenderer?.openExternal(sourceUrl);
  };

  const openLocalFile = () => {
    if (!specPath) return;
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:show-in-folder', specPath).catch(() => {
      toast.error('Error opening the folder');
    });
  };

  const menuItems = [
    {
      id: 'disconnect',
      label: 'Disconnect Sync',
      leftSection: IconUnlink,
      className: 'danger',
      onClick: onDisconnect
    }
  ];

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  return (
    <div className="spec-info-card">
      <div className="spec-info-header">
        <div className="spec-title-section">
          <div className="spec-title-row">
            <span className="spec-title">{title}</span>
            <span className="spec-version">{version}</span>
          </div>
          <div className="spec-info-meta">
            Grouped by: {groupBy} • Auto-check: every 5 minutes{lastSyncedAt && ` • Last synced: ${formatRelativeTime(lastSyncedAt)}`}
          </div>
        </div>
        <MenuDropdown items={menuItems} placement="bottom-end">
          <ActionIcon label="More options">
            <IconDotsVertical size={16} strokeWidth={2} />
          </ActionIcon>
        </MenuDropdown>
      </div>
      <div className="spec-info-body">
        <div className="spec-info-grid">
          <div className="spec-info-row">
            <span className="spec-label">Remote Spec</span>
            <div className="spec-value-row">
              <span className="spec-path" title={sourceUrl}>{sourceUrl}</span>
              <button className="copy-btn" onClick={copyUrl} title="Copy URL">
                <IconCopy size={12} />
              </button>
              <button className="copy-btn" onClick={openRemoteUrl} title="Open in browser">
                <IconExternalLink size={12} />
              </button>
            </div>
          </div>
          {lastSyncedAt && (
            <div className="spec-info-row">
              <span className="spec-label">Local Spec</span>
              <div className="spec-value-row">
                <span className="spec-path" title={specPath}>{specPath}</span>
                <button className="copy-btn" onClick={copyPath} title="Copy path">
                  <IconCopy size={12} />
                </button>
                <button className="copy-btn" onClick={openLocalFile} title="Reveal in Finder">
                  <IconFolder size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Unified Footer */}
      <div className={`spec-info-footer ${footerState.variant}`}>
        <div className="footer-top">
          <div className="footer-title-row">
            <div className={`status-dot ${footerState.dot}`} />
            <span className={`footer-title ${footerState.variant}`}>{footerState.title}</span>
            {footerState.hasLink && <span className="footer-link" onClick={onShowDiff}>View remote changes</span>}
          </div>
          <Button
            variant="filled"
            color="secondary"
            size="sm"
            onClick={onCheck}
            disabled={!canCheck}
            loading={isChecking}
            icon={<IconRefresh size={14} />}
          >
            Check for updates
          </Button>
        </div>
        {footerState.subtitle && <div className="footer-subtitle">{footerState.subtitle}</div>}
        {footerState.hasButtons === 'remote-drift' && (
          <div className="footer-buttons">
            <Button size="sm" onClick={onReviewAndSync}>Review and Sync Collection</Button>
            <Button variant="outline" size="sm" onClick={onDiscardAndSync}>Discard Local Changes and Sync Now</Button>
          </div>
        )}
        {footerState.hasButtons === 'setup' && (
          <div className="footer-buttons">
            <Button size="sm" onClick={onPreviewAndSync}>Review Changes and Sync Collection</Button>
            <Button variant="outline" size="sm" onClick={onSyncNow}>Skip Review and Sync Collection</Button>
          </div>
        )}
        {footerState.hasButtons === 'remote' && (
          <div className="footer-buttons">
            <Button size="sm" onClick={onPreviewAndSync}>Review and Sync Collection</Button>
            <Button variant="outline" size="sm" onClick={onSyncNow}>Skip Review and Sync Now</Button>
          </div>
        )}
        {footerState.hasButtons === 'drift' && (
          <div className="footer-buttons">
            <Button size="sm" onClick={onViewLocalChanges}>View Local Changes</Button>
            <Button variant="outline" size="sm" onClick={onResetAllModified}>Discard Local Changes</Button>
          </div>
        )}
        {footerState.hasButtons === 'spec-only' && (
          <div className="footer-buttons">
            <Button size="sm" onClick={() => onSyncNow?.()}>{footerState.specOnlyLabel || 'Update Spec File'}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecInfoCard;
