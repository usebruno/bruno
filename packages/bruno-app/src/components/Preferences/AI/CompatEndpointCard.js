import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import {
  IconAlertCircle,
  IconBolt,
  IconCheck,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconServer,
  IconTrash,
  IconX
} from '@tabler/icons';
import toast from 'react-hot-toast';
import { clearAiApiKey, getAiApiKey, setAiApiKey, testAiProvider } from 'utils/ai';

const stopBubble = (e) => e.stopPropagation();

const CompatEndpointCard = ({
  endpoint,
  provider,
  providerEnabled,
  providerToggle,
  pending,
  isModelEnabled,
  onToggleModel,
  onChangeName,
  onChangeBaseURL,
  onAddModel,
  onRemoveModel,
  onUpdateModel,
  onRemoveEndpoint,
  onStatusChange
}) => {
  const [expanded, setExpanded] = useState(!endpoint.baseURL);
  const [keyDraft, setKeyDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [newModelId, setNewModelId] = useState('');
  const [newModelLabel, setNewModelLabel] = useState('');

  const prev = useRef({ enabled: providerEnabled });
  useEffect(() => {
    const was = prev.current;
    if (!was.enabled && providerEnabled) setExpanded(true);
    else if (was.enabled && !providerEnabled) setExpanded(false);
    prev.current = { enabled: providerEnabled };
  }, [providerEnabled]);

  const isEditingKey = editing || !provider.configured;

  const handleSaveKey = async () => {
    const trimmed = keyDraft.trim();
    if (!trimmed) return;
    setSaving(true);
    setFeedback(null);
    try {
      const status = await setAiApiKey({ providerId: provider.id, apiKey: trimmed });
      onStatusChange?.(status);
      setKeyDraft('');
      setShowKey(false);
      setEditing(false);
      setFeedback({ type: 'success', message: 'API key saved' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save API key' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    setFeedback(null);
    try {
      const status = await clearAiApiKey({ providerId: provider.id });
      onStatusChange?.(status);
      setEditing(false);
      setKeyDraft('');
      toast.success(`${endpoint.name || 'Endpoint'} API key removed`);
    } catch (err) {
      toast.error(err.message || 'Failed to clear API key');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const result = await testAiProvider({ providerId: provider.id });
      if (result.ok) {
        setFeedback({ type: 'success', message: 'Connection successful' });
      } else {
        setFeedback({ type: 'error', message: result.error || 'Connection failed' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleStartEditKey = async () => {
    setEditing(true);
    setFeedback(null);
    try {
      const current = await getAiApiKey({ providerId: provider.id });
      setKeyDraft(current || '');
    } catch (err) {
      setKeyDraft('');
    }
  };

  const handleCancelEditKey = () => {
    setEditing(false);
    setKeyDraft('');
    setShowKey(false);
    setFeedback(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (keyDraft.trim() && !saving) handleSaveKey();
    } else if (e.key === 'Escape' && provider.configured) {
      e.preventDefault();
      handleCancelEditKey();
    }
  };

  const handleAddModel = () => {
    const id = newModelId.trim();
    if (!id) return;
    onAddModel({
      id: uuid(),
      modelId: id,
      label: newModelLabel.trim() || id
    });
    setNewModelId('');
    setNewModelLabel('');
  };

  const handleAddModelKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddModel();
    }
  };

  const models = endpoint.models || [];
  const enabledModelsCount = models.filter((m) => isModelEnabled(m.id)).length;

  return (
    <div className={`provider-row ${expanded ? 'expanded' : ''}`} data-testid={`ai-endpoint-${endpoint.id}`}>
      <div
        className="provider-header flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <IconServer size={16} strokeWidth={1.5} className="provider-logo flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-[12.5px] truncate">{endpoint.name || 'Unnamed endpoint'}</span>
            {endpoint.baseURL && (
              <span className="provider-status text-[10.5px] truncate">{endpoint.baseURL}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className={`provider-status inline-flex items-center gap-1.5 text-[11px] ${provider.configured ? 'configured' : ''}`}>
            <span className={`status-dot w-[7px] h-[7px] rounded-full ${provider.configured ? 'configured' : ''}`} />
            {provider.configured
              ? `${enabledModelsCount}/${models.length} model${models.length === 1 ? '' : 's'}`
              : 'Not configured'}
          </span>
          <span className="flex items-center" onClick={stopBubble}>
            {providerToggle}
          </span>
          <span className={`chevron flex items-center ${expanded ? 'expanded' : ''}`}>
            <IconChevronDown size={16} strokeWidth={1.5} />
          </span>
        </div>
      </div>

      <div className={`provider-body-wrapper ${expanded ? 'open' : ''}`}>
        <div className="provider-body-inner">
          <div className="provider-body flex flex-col gap-3.5 px-3 pt-3 pb-3">
            {/* Endpoint details */}
            <div className="grid grid-cols-2 gap-2" onClick={stopBubble}>
              <div className="flex flex-col gap-1">
                <label className="key-section-label text-[11px]" htmlFor={`endpoint-name-${endpoint.id}`}>
                  Name
                </label>
                <input
                  id={`endpoint-name-${endpoint.id}`}
                  type="text"
                  className="key-input w-full h-8 box-border text-xs leading-none pl-2.5 pr-2"
                  placeholder="e.g. Ollama local"
                  value={endpoint.name || ''}
                  onChange={(e) => onChangeName(e.target.value)}
                  onClick={stopBubble}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="key-section-label text-[11px]" htmlFor={`endpoint-baseurl-${endpoint.id}`}>
                  Base URL
                </label>
                <input
                  id={`endpoint-baseurl-${endpoint.id}`}
                  type="text"
                  className="key-input w-full h-8 box-border text-xs leading-none pl-2.5 pr-2"
                  placeholder="https://api.example.com/v1"
                  value={endpoint.baseURL || ''}
                  onChange={(e) => onChangeBaseURL(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  onClick={stopBubble}
                />
              </div>
            </div>

            {/* API key */}
            <div>
              <div className="key-section-label flex items-center justify-between gap-2 text-[11px] mb-1">
                <span>API Key</span>
              </div>

              {!isEditingKey ? (
                <div
                  className="key-display-row flex items-center justify-between gap-2 h-8 box-border pl-2.5 pr-0.5"
                  onClick={stopBubble}
                >
                  <span className="key-display-mask text-xs">••••••••••••••••</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="btn-icon w-7 h-7 box-border inline-flex items-center justify-center cursor-pointer"
                      onClick={handleTest}
                      disabled={testing || pending || !providerEnabled || !endpoint.baseURL}
                      title={endpoint.baseURL ? 'Test connection' : 'Set Base URL first'}
                      aria-label="Test connection"
                      data-testid={`ai-endpoint-${endpoint.id}-test`}
                    >
                      {testing ? <IconLoader2 size={15} className="spin" /> : <IconBolt size={15} />}
                    </button>
                    <button
                      type="button"
                      className="btn-icon w-7 h-7 box-border inline-flex items-center justify-center cursor-pointer"
                      onClick={handleStartEditKey}
                      disabled={pending}
                      title="Replace key"
                      aria-label="Replace key"
                      data-testid={`ai-endpoint-${endpoint.id}-edit-key`}
                    >
                      <IconPencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon danger w-7 h-7 box-border inline-flex items-center justify-center cursor-pointer"
                      onClick={handleClearKey}
                      disabled={pending}
                      title="Remove key"
                      aria-label="Remove key"
                      data-testid={`ai-endpoint-${endpoint.id}-clear-key`}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5" onClick={stopBubble}>
                  <div className="relative flex-1 flex items-center">
                    <input
                      id={`api-key-${provider.id}`}
                      type={showKey ? 'text' : 'password'}
                      className="key-input w-full h-8 box-border text-xs leading-none pl-2.5 pr-8"
                      placeholder="sk-..."
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onClick={stopBubble}
                      autoFocus
                      data-testid={`ai-endpoint-${endpoint.id}-key-input`}
                    />
                    <button
                      type="button"
                      className="key-eye-btn absolute right-1 p-1 inline-flex items-center cursor-pointer"
                      onClick={() => setShowKey(!showKey)}
                      tabIndex={-1}
                      aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showKey ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-primary h-8 box-border px-3 text-xs font-medium inline-flex items-center justify-center gap-1 cursor-pointer"
                    disabled={saving || pending || !keyDraft.trim()}
                    onClick={handleSaveKey}
                    data-testid={`ai-endpoint-${endpoint.id}-save-key`}
                  >
                    {saving ? <IconLoader2 size={13} className="spin" /> : <IconCheck size={13} />}
                    Save
                  </button>
                  {provider.configured && (
                    <button
                      type="button"
                      className="btn-icon w-7 h-7 box-border inline-flex items-center justify-center cursor-pointer"
                      onClick={handleCancelEditKey}
                      title="Cancel"
                    >
                      <IconX size={15} />
                    </button>
                  )}
                </div>
              )}

              {pending && (
                <div className="feedback flex items-center gap-1.5 text-[11px] px-2 py-1 mt-1.5" role="status">
                  <IconLoader2 size={12} className="spin" />
                  Saving endpoint…
                </div>
              )}

              {feedback && (
                <div
                  className={`feedback flex items-center gap-1.5 text-[11px] px-2 py-1 mt-1.5 ${feedback.type}`}
                  role="status"
                >
                  {feedback.type === 'success' ? <IconCheck size={12} /> : <IconAlertCircle size={12} />}
                  {feedback.message}
                </div>
              )}
            </div>

            {/* Models */}
            <div className="flex flex-col gap-1.5" onClick={stopBubble}>
              <div className="models-label-row flex items-center justify-between text-[11px]">
                <span>Models</span>
                {!provider.configured && (
                  <span className="keyless-hint flex items-center gap-1.5 text-[11px] py-1">
                    <IconAlertCircle size={12} />
                    Add an API key to enable
                  </span>
                )}
              </div>

              {models.length === 0 && (
                <div className="compat-models-empty text-[11px] px-2.5 py-2">
                  No models yet. Add the model id your provider expects (e.g. <code>gpt-4o</code> or <code>llama3.1:8b</code>).
                </div>
              )}

              {models.length > 0 && (
                <div className="flex flex-col gap-1">
                  {models.map((model) => {
                    const enabled = isModelEnabled(model.id);
                    const disabled = !provider.configured || !providerEnabled;
                    return (
                      <div
                        key={model.id}
                        className={`compat-model-row flex items-center gap-2 px-2.5 py-1.5 ${enabled && !disabled ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="cursor-pointer m-0"
                          checked={enabled}
                          disabled={disabled}
                          onChange={() => onToggleModel(model.id, !enabled)}
                        />
                        <input
                          type="text"
                          className="compat-inline-input flex-1 text-xs"
                          value={model.label || ''}
                          placeholder="Display name"
                          onChange={(e) => onUpdateModel(model.id, { label: e.target.value })}
                        />
                        <input
                          type="text"
                          className="compat-inline-input compat-inline-id flex-1 text-xs"
                          value={model.modelId || ''}
                          placeholder="Model id"
                          onChange={(e) => onUpdateModel(model.id, { modelId: e.target.value })}
                        />
                        <button
                          type="button"
                          className="btn-icon danger w-6 h-6 box-border inline-flex items-center justify-center cursor-pointer"
                          onClick={() => onRemoveModel(model.id)}
                          title="Remove model"
                          aria-label="Remove model"
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="compat-add-model flex items-center gap-1.5 mt-1">
                <input
                  type="text"
                  className="key-input flex-1 h-8 box-border text-xs leading-none pl-2.5 pr-2"
                  placeholder="Model id (required)"
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  onKeyDown={handleAddModelKeyDown}
                  data-testid={`ai-endpoint-${endpoint.id}-new-model-id`}
                />
                <input
                  type="text"
                  className="key-input flex-1 h-8 box-border text-xs leading-none pl-2.5 pr-2"
                  placeholder="Label (optional)"
                  value={newModelLabel}
                  onChange={(e) => setNewModelLabel(e.target.value)}
                  onKeyDown={handleAddModelKeyDown}
                  data-testid={`ai-endpoint-${endpoint.id}-new-model-label`}
                />
                <button
                  type="button"
                  className="btn-primary h-8 box-border px-3 text-xs font-medium inline-flex items-center justify-center gap-1 cursor-pointer"
                  disabled={!newModelId.trim()}
                  onClick={handleAddModel}
                  data-testid={`ai-endpoint-${endpoint.id}-add-model`}
                >
                  <IconPlus size={13} />
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1" onClick={stopBubble}>
              <button
                type="button"
                className="compat-remove-endpoint inline-flex items-center gap-1 text-[11px] cursor-pointer"
                onClick={() => onRemoveEndpoint(endpoint.id)}
                data-testid={`ai-endpoint-${endpoint.id}-remove`}
              >
                <IconTrash size={12} />
                Remove endpoint
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompatEndpointCard;
