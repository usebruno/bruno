import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import Modal from 'components/Modal';
import { isHttpUrl } from 'utils/url/index';
import { getAbsoluteFilePath } from 'utils/common/path';
import { findApiSpecByPathname } from 'utils/api-specs';
import useWorkspaceApiSpecs from 'hooks/useWorkspaceApiSpecs';
import SpecSourcePicker from 'components/OpenAPISyncTab/SpecSourcePicker';

const resolveInitialSource = (sourceUrl, collectionPath, workspaceSpecs) => {
  const source = (sourceUrl || '').trim();
  if (isHttpUrl(source)) {
    return { mode: 'url', sources: { workspace: '', url: source, file: '' } };
  }

  const filePath = source && collectionPath ? getAbsoluteFilePath(collectionPath, source) : source;
  if (findApiSpecByPathname(workspaceSpecs, filePath)) {
    return { mode: 'workspace', sources: { workspace: filePath, url: '', file: '' } };
  }
  return { mode: 'file', sources: { workspace: '', url: '', file: filePath } };
};

const ConnectionSettingsModal = ({ collection, sourceUrl, onSave, onDisconnect, onClose }) => {
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];
  const workspaceSpecs = useWorkspaceApiSpecs();
  const [initialSource] = useState(() => resolveInitialSource(sourceUrl, collection?.pathname, workspaceSpecs));
  const [mode, setMode] = useState(initialSource.mode);
  const [sources, setSources] = useState(initialSource.sources);
  const [autoCheck, setAutoCheck] = useState(openApiSyncConfig?.autoCheck !== false);
  const [checkInterval, setCheckInterval] = useState(openApiSyncConfig?.autoCheckInterval || 5);
  const [isSaving, setIsSaving] = useState(false);

  const intervals = [5, 15, 30, 60];

  const effectiveSource = sources[mode].trim();
  const canSave = mode === 'url' ? isHttpUrl(effectiveSource) : !!effectiveSource;

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
            <SpecSourcePicker
              mode={mode}
              onModeChange={setMode}
              value={sources[mode]}
              onChange={(value) => setSources((current) => ({ ...current, [mode]: value }))}
              onError={(message) => message && toast.error(message)}
            />
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
