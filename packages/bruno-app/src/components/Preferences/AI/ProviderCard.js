import { useEffect, useRef, useState } from 'react';
import {
  IconAlertCircle,
  IconBolt,
  IconCheck,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconPencil,
  IconTrash,
  IconX
} from '@tabler/icons';
import toast from 'react-hot-toast';
import { clearAiApiKey, getAiApiKey, setAiApiKey, testAiProvider } from 'utils/ai';

const OpenAiLogo = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

const AnthropicLogo = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918Zm-10.608 0L0 20.459h3.744l1.368-3.584h6.624l1.368 3.584h3.744L10.152 3.54H6.696Zm.432 10.418 2.208-5.784 2.208 5.784H7.128Z" />
  </svg>
);

const PROVIDER_LOGOS = {
  openai: OpenAiLogo,
  anthropic: AnthropicLogo
};

const stopBubble = (e) => e.stopPropagation();

const ProviderCard = ({
  provider,
  providerEnabled,
  providerToggle,
  models,
  isModelEnabled,
  onToggleModel,
  onStatusChange
}) => {
  const Logo = PROVIDER_LOGOS[provider.id];

  const [expanded, setExpanded] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const prev = useRef({ enabled: providerEnabled });
  useEffect(() => {
    const was = prev.current;
    if (!was.enabled && providerEnabled) {
      setExpanded(true);
    } else if (was.enabled && !providerEnabled) {
      setExpanded(false);
    }
    prev.current = { enabled: providerEnabled };
  }, [providerEnabled]);

  const isEditing = editing || !provider.configured;

  const handleSave = async () => {
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

  const handleClear = async () => {
    setFeedback(null);
    try {
      const status = await clearAiApiKey({ providerId: provider.id });
      onStatusChange?.(status);
      setEditing(false);
      setKeyDraft('');
      toast.success(`${provider.label} API key removed`);
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

  const handleCancelEdit = () => {
    setEditing(false);
    setKeyDraft('');
    setShowKey(false);
    setFeedback(null);
  };

  const handleStartEdit = async () => {
    setEditing(true);
    setFeedback(null);
    try {
      const current = await getAiApiKey({ providerId: provider.id });
      setKeyDraft(current || '');
    } catch (err) {
      // If we can't fetch it (decrypt failure etc.), leave the field empty.
      setKeyDraft('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (keyDraft.trim() && !saving) handleSave();
    } else if (e.key === 'Escape' && provider.configured) {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const enabledModelsCount = models.filter((m) => isModelEnabled(m.id)).length;

  return (
    <div className={`provider-row ${expanded ? 'expanded' : ''}`} data-testid={`ai-provider-${provider.id}`}>
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
          {Logo ? <Logo className="provider-logo w-[18px] h-[18px] flex-shrink-0" /> : null}
          <span className="font-semibold text-[12.5px]">{provider.label}</span>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className={`provider-status inline-flex items-center gap-1.5 text-[11px] ${provider.configured ? 'configured' : ''}`}>
            <span className={`status-dot w-[7px] h-[7px] rounded-full ${provider.configured ? 'configured' : ''}`} />
            {provider.configured
              ? `${enabledModelsCount}/${models.length} models`
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
            {/* API key */}
            <div>
              <div className="key-section-label flex items-center justify-between gap-2 text-[11px] mb-1">
                <span>API Key</span>
              </div>

              {!isEditing ? (
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
                      disabled={testing || !providerEnabled}
                      title="Test connection"
                      aria-label="Test connection"
                    >
                      {testing ? <IconLoader2 size={15} className="spin" /> : <IconBolt size={15} />}
                    </button>
                    <button
                      type="button"
                      className="btn-icon w-7 h-7 box-border inline-flex items-center justify-center cursor-pointer"
                      onClick={handleStartEdit}
                      title="Replace key"
                      aria-label="Replace key"
                    >
                      <IconPencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon danger w-7 h-7 box-border inline-flex items-center justify-center cursor-pointer"
                      onClick={handleClear}
                      title="Remove key"
                      aria-label="Remove key"
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
                      placeholder={provider.apiKeyPlaceholder}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onClick={stopBubble}
                      autoFocus
                      data-testid={`ai-provider-${provider.id}-key-input`}
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
                    disabled={saving || !keyDraft.trim()}
                    onClick={handleSave}
                    data-testid={`ai-provider-${provider.id}-save`}
                  >
                    {saving ? <IconLoader2 size={13} className="spin" /> : <IconCheck size={13} />}
                    Save
                  </button>
                  {provider.configured && (
                    <button
                      type="button"
                      className="btn-icon w-7 h-7 box-border inline-flex items-center justify-center cursor-pointer"
                      onClick={handleCancelEdit}
                      title="Cancel"
                    >
                      <IconX size={15} />
                    </button>
                  )}
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
            {models.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="models-label-row flex items-center justify-between text-[11px]">
                  <span>Models</span>
                  {!provider.configured && (
                    <span className="keyless-hint flex items-center gap-1.5 text-[11px] py-1">
                      <IconAlertCircle size={12} />
                      Add an API key to enable
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {models.map((model) => {
                    const enabled = isModelEnabled(model.id);
                    const disabled = !provider.configured || !providerEnabled;
                    return (
                      <label
                        key={model.id}
                        className={`model-chip flex items-center gap-2 px-2.5 py-1.5 cursor-pointer select-none ${enabled && !disabled ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                        onClick={stopBubble}
                      >
                        <input
                          type="checkbox"
                          className="cursor-pointer m-0"
                          checked={enabled}
                          disabled={disabled}
                          onChange={() => onToggleModel(model.id, !enabled)}
                        />
                        <span className="text-xs">{model.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
