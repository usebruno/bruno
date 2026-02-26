import { useState, useRef, useEffect } from 'react';
import {
  IconCopy,
  IconDotsVertical,
  IconUnlink,
  IconSettings
} from '@tabler/icons';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import ActionIcon from 'ui/ActionIcon/index';
import MenuDropdown from 'ui/MenuDropdown';
import Modal from 'components/Modal';

const isLocalPath = (str) => !!str && !str.startsWith('http://') && !str.startsWith('https://');

const ConnectionSettingsModal = ({ collection, sourceUrl, onSave, onDisconnect, onClose }) => {
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];
  const initialMode = isLocalPath(sourceUrl) ? 'file' : 'url';
  const [mode, setMode] = useState(initialMode);
  const [url, setUrl] = useState(isLocalPath(sourceUrl) ? '' : (sourceUrl || ''));
  const [filePath, setFilePath] = useState(isLocalPath(sourceUrl) ? sourceUrl : '');
  const [autoCheck, setAutoCheck] = useState(openApiSyncConfig?.autoCheck !== false);
  const [interval, setInterval] = useState(openApiSyncConfig?.autoCheckInterval || 5);
  const fileInputRef = useRef(null);

  const intervals = [5, 15, 30, 60];

  const effectiveSource = mode === 'file' ? filePath : url.trim();

  const handleSave = () => {
    onSave({ sourceUrl: effectiveSource, autoCheck, autoCheckInterval: interval });
    onClose();
  };

  return (
    <Modal
      size="md"
      title="Connection Settings"
      hideFooter={true}
      handleCancel={onClose}
    >
      <div className="settings-modal">
        <div className="settings-body">
          <div className="settings-field">
            <label className="settings-label">Spec Source</label>
            <div className="setup-mode-toggle" style={{ marginBottom: '8px' }}>
              <button
                type="button"
                className={`setup-mode-btn ${mode === 'url' ? 'active' : ''}`}
                onClick={() => {
                  setMode('url'); setFilePath('');
                }}
              >
                URL
              </button>
              <button
                type="button"
                className={`setup-mode-btn ${mode === 'file' ? 'active' : ''}`}
                onClick={() => {
                  setMode('file'); setUrl('');
                }}
              >
                File
              </button>
            </div>

            {mode === 'url' ? (
              <input
                className="settings-input"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/openapi.json"
              />
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFilePath(window.ipcRenderer.getFilePath(file));
                    }
                  }}
                />
                <button
                  type="button"
                  className="settings-input file-pick-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {filePath ? filePath.split(/[\\/]/).pop() : 'Choose file...'}
                </button>
              </>
            )}
          </div>

          <div className="settings-field">
            <label className="settings-label">Auto-check for updates</label>
            <div className="settings-toggle-row">
              <div className="toggle-info">
                <div className="toggle-description">
                  Automatically check for spec changes at a regular interval
                </div>
              </div>
              <button
                className={`toggle-switch ${autoCheck ? 'active' : ''}`}
                onClick={() => setAutoCheck(!autoCheck)}
                type="button"
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {autoCheck && (
            <div className="settings-field">
              <label className="settings-label">Check interval</label>
              <div className="interval-buttons">
                {intervals.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={interval === mins ? 'active' : ''}
                    onClick={() => setInterval(mins)}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="disconnect-link" onClick={onDisconnect} type="button">
            Disconnect sync
          </button>
          <div className="settings-actions">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!effectiveSource}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

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

const SpecInfoCard = ({
  collection, spec, sourceUrl, onDisconnect, onViewSpec, onSaveSettings,
  triggerOpenSettings, onTriggerOpenSettingsHandled
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const sourceIsLocal = isLocalPath(sourceUrl);

  // External trigger to open settings modal (e.g. from file-not-found banner)
  useEffect(() => {
    if (triggerOpenSettings && !showSettingsModal) {
      setShowSettingsModal(true);
      onTriggerOpenSettingsHandled?.();
    }
  }, [triggerOpenSettings]);

  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];
  const title = spec?.info?.title || 'Unknown API';
  const version = spec?.info?.version || '-';

  const lastSyncedAt = openApiSyncConfig?.lastSyncDate;
  const autoCheckEnabled = openApiSyncConfig?.autoCheck !== false;
  const autoCheckInterval = openApiSyncConfig?.autoCheckInterval || 5;
  const groupBy = openApiSyncConfig?.groupBy || 'tags';

  const copyUrl = async () => {
    if (!sourceUrl) return;
    if (sourceIsLocal) {
      const absolutePath = await window.ipcRenderer.invoke('renderer:resolve-path', {
        basePath: collection.pathname,
        relativePath: sourceUrl
      });
      navigator.clipboard.writeText(absolutePath);
    } else {
      navigator.clipboard.writeText(sourceUrl);
    }
    toast.success(sourceIsLocal ? 'Path copied to clipboard' : 'URL copied to clipboard');
  };

  const revealInFolder = () => {
    if (!sourceUrl) return;
    window.ipcRenderer.invoke('renderer:show-in-folder', {
      filePath: sourceUrl,
      collectionPath: collection.pathname
    }).catch((err) => {
      console.error('Error revealing in folder:', err);
      toast.error('Failed to open in file manager');
    });
  };

  const menuItems = [
    {
      id: 'settings',
      label: 'Edit connection settings',
      leftSection: IconSettings,
      onClick: () => setShowSettingsModal(true)
    },
    {
      id: 'disconnect',
      label: 'Disconnect Sync',
      leftSection: IconUnlink,
      className: 'delete-item',
      onClick: onDisconnect
    }
  ];

  return (
    <>
      <div className="spec-info-card">
        <div className="spec-info-header">
          <div className="spec-title-section">
            <div className="spec-title-row">
              <span className="spec-title">{title}</span>
              <span className="spec-version">{version}</span>
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
          {lastSyncedAt && ` · Last synced ${formatRelativeTime(lastSyncedAt)}`}
        </div>
      </div>

      {showSettingsModal && (
        <ConnectionSettingsModal
          collection={collection}
          sourceUrl={sourceUrl}
          onSave={onSaveSettings}
          onDisconnect={() => {
            setShowSettingsModal(false);
            onDisconnect();
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </>
  );
};

export default SpecInfoCard;
