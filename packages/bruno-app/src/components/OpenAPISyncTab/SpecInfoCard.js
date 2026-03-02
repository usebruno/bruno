import {
  IconCopy,
  IconDotsVertical,
  IconUnlink,
  IconSettings
} from '@tabler/icons';
import moment from 'moment';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import StatusBadge from 'ui/StatusBadge';
import ActionIcon from 'ui/ActionIcon/index';
import MenuDropdown from 'ui/MenuDropdown';

const SpecInfoCard = ({
  collection, spec, sourceUrl, onViewSpec,
  onOpenSettings, onOpenDisconnect
}) => {
  const sourceIsLocal = !sourceUrl?.startsWith('http');

  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];
  const title = spec?.info?.title || 'Unknown API';
  const version = spec?.info?.version || '-';

  const lastSyncedAt = openApiSyncConfig?.lastSyncDate;
  const autoCheckEnabled = openApiSyncConfig?.autoCheck !== false;
  const autoCheckInterval = openApiSyncConfig?.autoCheckInterval || 5;
  const groupBy = openApiSyncConfig?.groupBy || 'tags';

  const copyUrl = async () => {
    if (!sourceUrl) return;
    try {
      if (sourceIsLocal) {
        const absolutePath = await window.ipcRenderer.invoke('renderer:resolve-path', sourceUrl, collection.pathname);
        await navigator.clipboard.writeText(absolutePath);
      } else {
        await navigator.clipboard.writeText(sourceUrl);
      }
      toast.success(sourceIsLocal ? 'Path copied to clipboard' : 'URL copied to clipboard');
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const revealInFolder = async () => {
    if (!sourceUrl) return;
    try {
      const absolutePath = await window.ipcRenderer.invoke('renderer:resolve-path', sourceUrl, collection.pathname);
      await window.ipcRenderer.invoke('renderer:show-in-folder', absolutePath);
    } catch (err) {
      console.error('Error revealing in folder:', err);
      toast.error('Failed to open in file manager');
    }
  };

  const menuItems = [
    {
      id: 'settings',
      label: 'Edit connection settings',
      leftSection: IconSettings,
      onClick: onOpenSettings
    },
    {
      id: 'disconnect',
      label: 'Disconnect Sync',
      leftSection: IconUnlink,
      className: 'delete-item',
      onClick: onOpenDisconnect
    }
  ];

  return (
    <div className="spec-info-card">
      <div className="spec-info-header">
        <div className="spec-title-section">
          <div className="spec-title-row">
            <span className="spec-title">{title}</span>
            <StatusBadge status="muted" className="spec-version">{version}</StatusBadge>
          </div>
        </div>
        <div className="spec-header-actions">
          <Button
            color="secondary"
            size="sm"
            onClick={onViewSpec}
          >
            View spec
          </Button>
          <MenuDropdown items={menuItems} placement="bottom-end">
            <ActionIcon label="More options">
              <IconDotsVertical size={16} strokeWidth={2} />
            </ActionIcon>
          </MenuDropdown>
        </div>
      </div>
      <div className="spec-url-row">
        <span className="spec-url-label">{sourceIsLocal ? 'Source File' : 'Source URL'}</span>
        {sourceIsLocal ? (
          <button
            className="spec-url-value spec-file-reveal"
            title="Reveal in file manager"
            type="button"
            onClick={revealInFolder}
          >
            {sourceUrl}
          </button>
        ) : (
          <a
            className="spec-url-value"
            href={sourceUrl}
            title={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {sourceUrl}
          </a>
        )}
        <button className="copy-btn" onClick={copyUrl} title={sourceIsLocal ? 'Copy path' : 'Copy URL'} type="button">
          <IconCopy size={12} />
        </button>
      </div>
      <div className="spec-info-meta">
        {`Grouped by ${groupBy}`}
        {autoCheckEnabled
          ? ` · Auto-check every ${autoCheckInterval} min`
          : ' · Auto-check disabled'}
        {lastSyncedAt && ` · Last synced ${moment(lastSyncedAt).fromNow()}`}
      </div>
    </div>
  );
};

export default SpecInfoCard;
