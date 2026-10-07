import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import Modal from 'components/Modal';
import { isHttpUrl } from 'utils/url/index';
import { isOpenApiSpec } from 'utils/importers/openapi-collection';
import { parseFileAsJsonOrYaml } from 'utils/importers/file-reader';

const ConnectionSettingsModal = ({ collection, sourceUrl, onSave, onDisconnect, onClose }) => {
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];
  const normalizedSourceUrl = (sourceUrl || '').trim();
  const isUrl = isHttpUrl(normalizedSourceUrl);
  const initialMode = isUrl ? 'url' : 'file';
  const [mode, setMode] = useState(initialMode);
  const [url, setUrl] = useState(isUrl ? normalizedSourceUrl : '');
  const [filePath, setFilePath] = useState(isUrl ? '' : normalizedSourceUrl);
  const [autoCheck, setAutoCheck] = useState(openApiSyncConfig?.autoCheck !== false);
  const [checkInterval, setCheckInterval] = useState(openApiSyncConfig?.autoCheckInterval || 5);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const intervals = [5, 15, 30, 60];

  const effectiveSource = mode === 'file' ? filePath : url.trim();
  const canSave = mode === 'file' ? !!effectiveSource : isHttpUrl(effectiveSource.trim());

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ sourceUrl: effectiveSource, autoCheck, autoCheckInterval: checkInterval });
      onClose();
    } catch (_) {
      // caller (handleSaveSettings) already shows a toast on failure
    } finally {
      setIsSaving(false);
    }
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
                onClick={() => setMode('url')}
              >
                URL
              </button>
              <button
                type="button"
                className={`setup-mode-btn ${mode === 'file' ? 'active' : ''}`}
                onClick={() => setMode('file')}
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
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const data = await parseFileAsJsonOrYaml(file);
                        if (!isOpenApiSpec(data)) {
                          toast.error('The selected file is not a valid OpenAPI 3.x specification');
                          return;
                        }
                        const path = window.ipcRenderer.getFilePath(file);
                        if (path) setFilePath(path);
                      } catch (err) {
                        toast.error(err.message || 'Failed to read the selected file');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="settings-input file-pick-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {filePath ? filePath.split(/[\\/]/).pop() : 'Select File'}
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
                    className={checkInterval === mins ? 'active' : ''}
                    onClick={() => setCheckInterval(mins)}
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
            <Button variant="ghost" color="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={isSaving} disabled={!canSave || isSaving}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConnectionSettingsModal;
