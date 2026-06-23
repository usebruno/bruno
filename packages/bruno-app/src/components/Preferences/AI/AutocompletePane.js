import { IconChevronDown } from '@tabler/icons';
import ToggleSwitch from 'components/ToggleSwitch';

/**
 * Autocomplete tab content. Sibling of the Configuration tab inside
 * Preferences > AI.
 *
 *   - master AI off          → notice only; the whole card is hidden
 *   - no provider configured → notice in the card body, controls disabled
 *   - no enabled model       → notice in the card body, controls disabled
 *   - everything on          → fully interactive
 */

const TRIGGER_MODES = [
  {
    value: 'aggressive',
    label: 'Aggressive',
    description: 'Suggest after every keystroke'
  },
  {
    value: 'debounced',
    label: 'Debounced',
    description: 'Suggest after you pause typing (default)'
  },
  {
    value: 'manual',
    label: 'Manual',
    description: 'Only on ⌘+\\ / Ctrl+\\'
  }
];

const AutocompletePane = ({
  aiEnabled,
  enabled,
  model,
  triggerMode,
  availableModels,
  hasConfiguredProvider,
  onToggleEnabled,
  onChangeModel,
  onChangeTriggerMode
}) => {
  if (!aiEnabled) {
    return (
      <div className="autocomplete-tab flex flex-col gap-3">
        <div className="ai-empty-notice px-3.5 py-3 text-xs">
          Turn on AI in the Configuration tab to use autocomplete.
        </div>
      </div>
    );
  }

  const hasUsableModel = availableModels.length > 0;
  const isInteractive = enabled && hasUsableModel;
  const activeTrigger = TRIGGER_MODES.find((m) => m.value === (triggerMode || 'debounced'));

  // Surface the most actionable blocker first when the user can't actually
  // get suggestions yet.
  let blockerMessage = null;
  if (!hasConfiguredProvider) {
    blockerMessage = 'Add a provider API key in the Configuration tab to enable autocomplete.';
  } else if (!hasUsableModel) {
    blockerMessage = 'No models are available. Enable a model on its provider card in Configuration.';
  }

  return (
    <div className="autocomplete-tab flex flex-col gap-3">
      <div className="autocomplete-card">
        <div className="autocomplete-header flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12.5px] font-semibold">Inline Autocomplete</span>
            <span className="autocomplete-sub text-[11px]">
              Ghost-text suggestions in Pre-Request, Post-Response, and Tests scripts
            </span>
          </div>
          <ToggleSwitch
            size="m"
            isOn={enabled}
            handleToggle={() => onToggleEnabled(!enabled)}
            data-testid="ai-autocomplete-enabled-toggle"
          />
        </div>
      </div>

      <div className={`autocomplete-card ${enabled ? '' : 'dimmed'}`}>
        {blockerMessage && (
          <div className="autocomplete-blocker px-3.5 py-3 text-[11px]">
            {blockerMessage}
          </div>
        )}

        <div className="autocomplete-row flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11.5px] font-medium">Model</span>
            <span className="autocomplete-sub text-[10.5px]">
              {hasUsableModel
                ? 'Lightweight models are recommended for speed'
                : 'No model available yet'}
            </span>
          </div>
          <div className="model-select-wrap relative inline-flex items-center">
            <select
              className="model-select"
              value={model || ''}
              disabled={!isInteractive}
              onChange={(e) => onChangeModel(e.target.value)}
              aria-label="Autocomplete model"
              data-testid="ai-autocomplete-model-select"
            >
              <option value="">Auto (fastest available)</option>
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <IconChevronDown size={12} strokeWidth={1.75} className="model-select-chevron" />
          </div>
        </div>

        <div className="autocomplete-row flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11.5px] font-medium">Trigger</span>
            <span className="autocomplete-sub text-[10.5px]">
              {activeTrigger?.description}
            </span>
          </div>
          <div className="trigger-pills inline-flex" role="radiogroup" aria-label="Trigger mode">
            {TRIGGER_MODES.map((m) => {
              const isSelected = (triggerMode || 'debounced') === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`trigger-pill ${isSelected ? 'selected' : ''}`}
                  disabled={!isInteractive}
                  onClick={() => onChangeTriggerMode(m.value)}
                  data-testid={`ai-autocomplete-trigger-${m.value}`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="autocomplete-row px-3.5 py-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11.5px] font-medium">Keymap</span>
            <div className="autocomplete-keymap text-[10.5px]">
              <kbd>Tab</kbd> accept · <kbd>Esc</kbd> dismiss · <kbd>⌘</kbd>+<kbd>\</kbd> trigger
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutocompletePane;
