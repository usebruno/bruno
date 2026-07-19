import { useState } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons';
import ToggleSwitch from 'components/ToggleSwitch';

const BUILT_IN_HEADER_EXAMPLES = [
  'Authorization',
  'Proxy-Authorization',
  'Cookie',
  'Set-Cookie',
  'X-API-Key',
  'X-Auth-Token',
  'X-Access-Token',
  'X-CSRF-Token'
];

const normalize = (raw) => String(raw || '').trim();

/**
 * Compact editor for a case-insensitive name list. Used for both custom
 * header names and custom variable names — the shape is identical.
 */

const CHIP_MAX_LENGTH = 200;
const CHIP_MAX_COUNT = 200;

const ChipListEditor = ({ list, placeholder, onChange, addTestId, inputTestId, removeTestIdPrefix }) => {
  const [draft, setDraft] = useState('');
  const values = Array.isArray(list) ? list : [];
  const atCapacity = values.length >= CHIP_MAX_COUNT;

  const handleAdd = () => {
    const value = normalize(draft);
    if (!value || value.length > CHIP_MAX_LENGTH || atCapacity) return;
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };

  const handleRemove = (name) => {
    onChange(values.filter((v) => v !== name));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const trimmedDraft = normalize(draft);
  const draftTooLong = trimmedDraft.length > CHIP_MAX_LENGTH;
  const addDisabled = !trimmedDraft || draftTooLong || atCapacity;

  return (
    <>
      <div className="security-add-row flex items-center gap-2">
        <input
          type="text"
          className="security-input flex-1"
          placeholder={placeholder}
          value={draft}
          maxLength={CHIP_MAX_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={atCapacity}
          data-testid={inputTestId}
        />
        <button
          type="button"
          className="security-add-btn inline-flex items-center gap-1 text-[11px] font-medium"
          onClick={handleAdd}
          disabled={addDisabled}
          data-testid={addTestId}
        >
          <IconPlus size={13} strokeWidth={1.75} />
          Add
        </button>
      </div>

      {atCapacity && (
        <span className="security-sub text-[10.5px]">
          Reached the {CHIP_MAX_COUNT}-entry limit. Remove one to add another.
        </span>
      )}

      {values.length > 0 && (
        <ul className="security-chip-list flex flex-wrap gap-1.5">
          {values.map((name) => (
            <li key={name} className="security-chip inline-flex items-center gap-1">
              <span className="security-chip-text">{name}</span>
              <button
                type="button"
                className="security-chip-remove"
                onClick={() => handleRemove(name)}
                aria-label={`Remove ${name}`}
                data-testid={removeTestIdPrefix ? `${removeTestIdPrefix}-${name}` : undefined}
              >
                <IconTrash size={11} strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

const SecurityPane = ({
  aiEnabled,
  redactHeaders,
  redactBody,
  redactVariables,
  redactResponse,
  customRedactedHeaders,
  customRedactedVariables,
  onToggleRedactHeaders,
  onToggleRedactBody,
  onToggleRedactVariables,
  onToggleRedactResponse,
  onChangeCustomRedactedHeaders,
  onChangeCustomRedactedVariables
}) => {
  if (!aiEnabled) {
    return (
      <div className="security-tab flex flex-col gap-3">
        <div className="ai-empty-notice px-3.5 py-3 text-xs">
          Turn on AI in the Configuration tab to configure redaction.
        </div>
      </div>
    );
  }

  return (
    <div className="security-tab flex flex-col gap-3">
      <div className="ai-empty-notice px-3.5 py-3 text-xs">
        Sensitive data is automatically redacted before context is sent to AI providers. Turn off protections if needed, or add custom headers and variables to redact.
      </div>

      <div className="security-card">
        <div className="security-row flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12.5px] font-semibold">Redact sensitive header values</span>
            <span className="security-sub text-[11px]">
              Masks Authorization, cookies, API keys and other credential-bearing headers in the request context.
            </span>
          </div>
          <ToggleSwitch
            size="xs"
            isOn={redactHeaders}
            handleToggle={() => onToggleRedactHeaders(!redactHeaders)}
            data-testid="ai-security-headers-toggle"
          />
        </div>

        <div className="security-row flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12.5px] font-semibold">Redact sensitive body keys</span>
            <span className="security-sub text-[11px]">
              Masks values under keys like <code>password</code>, <code>*_token</code>, <code>secret</code> in JSON and GraphQL variables. Structure and non-sensitive fields still pass through.
            </span>
          </div>
          <ToggleSwitch
            size="xs"
            isOn={redactBody}
            handleToggle={() => onToggleRedactBody(!redactBody)}
            data-testid="ai-security-body-toggle"
          />
        </div>

        <div className="security-row flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12.5px] font-semibold">Redact response values</span>
            <span className="security-sub text-[11px]">
              Sends the response as a shape only — real values replaced with type placeholders (<code>&lt;string&gt;</code>, <code>&lt;number&gt;</code>). Turn off to send the actual response body.
            </span>
          </div>
          <ToggleSwitch
            size="xs"
            isOn={redactResponse}
            handleToggle={() => onToggleRedactResponse(!redactResponse)}
            data-testid="ai-security-response-toggle"
          />
        </div>

        <div className="security-row flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12.5px] font-semibold">Redact secret variable values</span>
            <span className="security-sub text-[11px]">
              Masks values whose names look like secrets. Variables explicitly marked <em>secret</em> are always redacted regardless of this switch.
            </span>
          </div>
          <ToggleSwitch
            size="xs"
            isOn={redactVariables}
            handleToggle={() => onToggleRedactVariables(!redactVariables)}
            data-testid="ai-security-variables-toggle"
          />
        </div>
      </div>

      <div className="security-card">
        <div className="security-row flex flex-col gap-2 px-3.5 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px] font-semibold">Custom redacted headers</span>
            <span className="security-sub text-[11px]">
              Exact, case-insensitive header names to always mask on top of the built-in list.
            </span>
          </div>
          <ChipListEditor
            list={customRedactedHeaders}
            placeholder="X-Custom-Token"
            onChange={onChangeCustomRedactedHeaders}
            inputTestId="ai-security-custom-header-input"
            addTestId="ai-security-custom-header-add"
            removeTestIdPrefix="ai-security-custom-header-remove"
          />
        </div>

        <div className="security-row flex flex-col gap-2 px-3.5 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px] font-semibold">Custom redacted variables</span>
            <span className="security-sub text-[11px]">
              Variable names whose values should always be masked when Bruno lists them for the model — for anything you want redacted besides values already flagged as <em>secret</em>.
            </span>
          </div>
          <ChipListEditor
            list={customRedactedVariables}
            placeholder="MY_SESSION_TOKEN"
            onChange={onChangeCustomRedactedVariables}
            inputTestId="ai-security-custom-var-input"
            addTestId="ai-security-custom-var-add"
            removeTestIdPrefix="ai-security-custom-var-remove"
          />
        </div>

        <div className="security-row flex flex-col gap-1 px-3.5 py-3">
          <span className="text-[11px] font-medium security-sub">Already covered by default</span>
          <div className="security-builtin flex flex-wrap gap-1.5">
            {BUILT_IN_HEADER_EXAMPLES.map((name) => (
              <span key={name} className="security-builtin-chip">{name}</span>
            ))}
            <span className="security-builtin-more text-[10.5px]">
              plus any name matching <code>token</code>, <code>secret</code>, <code>password</code> or <code>api_key</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPane;
