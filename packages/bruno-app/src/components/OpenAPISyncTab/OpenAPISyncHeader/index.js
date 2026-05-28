import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  IconCopy,
  IconDotsVertical,
  IconUnlink,
  IconSettings,
  IconRefresh,
  IconCircleCheck,
  IconAlertTriangle
} from '@tabler/icons';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import ActionIcon from 'ui/ActionIcon/index';
import MenuDropdown from 'ui/MenuDropdown';
import Help from 'components/Help';
import { isHttpUrl } from 'utils/url/index';

const OpenAPISyncHeader = ({
  collection, spec, sourceUrl, syncStatus, onViewSpec,
  onOpenSettings, onOpenDisconnect,
  onCheck, isLoading
}) => {
  const sourceIsLocal = !isHttpUrl(sourceUrl);
  const canCheck = !!sourceUrl?.trim();

  // Resolve relative file paths to absolute for display
  const [displayPath, setDisplayPath] = useState(sourceUrl);
  useEffect(() => {
    if (sourceIsLocal && sourceUrl) {
      window.ipcRenderer.invoke('renderer:resolve-path', sourceUrl, collection.pathname)
        .then((resolved) => setDisplayPath(resolved))
        .catch(() => setDisplayPath(sourceUrl));
    } else {
      setDisplayPath(sourceUrl);
    }
  }, [sourceUrl, sourceIsLocal, collection.pathname]);

  const specMeta = useSelector((state) => state.openapiSync?.storedSpecMeta?.[collection.uid] || null);
  const title = specMeta?.title || spec?.info?.title || 'Unknown API';

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
          </div>
        </div>
        <div className="spec-header-actions">
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
        <span className="spec-url-label">{sourceIsLocal ? 'Source File:' : 'Source URL:'}</span>
        {sourceIsLocal ? (
          <button
            className="spec-url-value spec-file-reveal"
            title="Reveal in file manager"
            type="button"
            onClick={revealInFolder}
          >
            {displayPath}
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
      <div className="linked-collection-row mt-1">
        <span className="spec-url-label">Linked Collection:</span>
        <span className="linked-collection-name">{collection.name}</span>
        {syncStatus === 'in-sync' && (
          <Help
            placement="bottom"
            width={240}
            iconComponent={() => <IconCircleCheck size={14} className="sync-status-icon in-sync" />}
          >
            Collection is up to date with the spec
          </Help>
        )}
        {syncStatus === 'not-in-sync' && (
          <Help
            placement="bottom"
            width={260}
            iconComponent={() => <IconAlertTriangle size={14} className="sync-status-icon not-in-sync" />}
          >
            Collection is not up to date with the spec
          </Help>
        )}
      </div>
    </div>
  );
};

export default OpenAPISyncHeader;
